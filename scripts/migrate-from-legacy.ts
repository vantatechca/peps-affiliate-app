// ============================================================
// peps_affiliate → AFFEXCH data migration (ETL)
// ============================================================
// Moves Users, DiscountCodes, Orders, OrderCommissions, CommissionSplits and
// Payouts from the OLD peps_affiliate Postgres into THIS app's database.
//
// Design:
//  - Reads the old DB directly via LEGACY_DATABASE_URL (re-runnable; no dump needed).
//  - Writes to DATABASE_URL (this app's DB).
//  - Idempotent: keeps the original UUIDs so every foreign key lines up and the
//    script can be run repeatedly (ON CONFLICT DO NOTHING / DO UPDATE).
//  - Maps the old flat code-model onto the new schema:
//      User            -> users (+ creator_profiles for affiliates)
//      DiscountCode     -> promo_codes (+ legacy_discount_percent / legacy_commission_rate)
//      CommissionSplit  -> legacy_commission_splits
//      Payout           -> creator_payouts
//      Order            -> legacy_orders   (ALL orders, attributed or not)
//      OrderCommission  -> legacy_order_commissions
//    Attributed orders are ALSO projected into code_redemptions (native dashboard).
//  - passwordPlain is deliberately DISCARDED (never copied into the new app).
//
// Usage:
//   LEGACY_DATABASE_URL=postgres://...old...  \
//   DATABASE_URL=postgres://...new...         \
//   npx tsx scripts/migrate-from-legacy.ts [--dry-run]
//
// A "house" vendor (PEPS House) is created to own the projected code_redemptions,
// since the old reseller network funnels all 600 stores into one checkout.

import { Pool } from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

// Fixed IDs so the house vendor is stable across re-runs.
const HOUSE_USER_ID = 'a0000000-0000-4000-8000-0000000000a1';
const HOUSE_VENDOR_ID = 'a0000000-0000-4000-8000-0000000000a2';
const DEFAULT_COMMISSION_RATE = 0.2;

function makePool(url: string | undefined, label: string): Pool {
  if (!url) {
    console.error(`${label} is not set.`);
    process.exit(1);
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 4,
  });
}

const legacy = makePool(process.env.LEGACY_DATABASE_URL, 'LEGACY_DATABASE_URL');
const target = makePool(process.env.DATABASE_URL, 'DATABASE_URL');

// Counters for the reconciliation report.
const stats: Record<string, number> = {};
function bump(k: string, n = 1) { stats[k] = (stats[k] || 0) + n; }

// In dry-run we don't write; helper returns early.
async function write(sql: string, params: any[]): Promise<void> {
  if (DRY_RUN) return;
  await target.query(sql, params);
}

function splitName(full: string | null): { first: string; last: string | null } {
  const name = (full || '').trim();
  if (!name) return { first: 'Unknown', last: null };
  const parts = name.split(/\s+/);
  return { first: parts[0], last: parts.length > 1 ? parts.slice(1).join(' ') : null };
}

function mapRole(role: string): 'creator' | 'admin' {
  return role === 'AFFILIATE' ? 'creator' : 'admin'; // ADMIN + SUPER_ADMIN -> admin
}

function mapPayoutStatus(s: string): string {
  if (s === 'PAID') return 'paid';
  return 'pending'; // PENDING + PROCESSING -> pending
}

async function ensureHouseVendor() {
  await write(
    `INSERT INTO users (id, username, email, password, role, account_status, email_verified, first_name, last_name)
     VALUES ($1,$2,$3,NULL,'company','active',true,'PEPS','House')
     ON CONFLICT (id) DO NOTHING`,
    [HOUSE_USER_ID, 'peps-house', 'house@peps.local'],
  );
  await write(
    `INSERT INTO vendor_profiles (id, user_id, legal_name, trade_name, website_verified, status)
     VALUES ($1,$2,'PEPS House','PEPS',true,'approved')
     ON CONFLICT (id) DO NOTHING`,
    [HOUSE_VENDOR_ID, HOUSE_USER_ID],
  );
  bump('house_vendor', 1);
}

async function migrateUsers() {
  const { rows } = await legacy.query(
    `SELECT id, email, "passwordHash", name, role, "defaultCommissionRate", active, "createdAt", "updatedAt" FROM "User"`,
  );
  const usedUsernames = new Set<string>();
  // Seed with existing usernames in the target so we don't collide with prior data.
  if (!DRY_RUN) {
    const ex = await target.query(`SELECT username FROM users`);
    for (const r of ex.rows) usedUsernames.add(r.username);
  }
  for (const u of rows) {
    const email = String(u.email).toLowerCase();
    let base = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '').toLowerCase() || 'user';
    let username = base;
    let i = 1;
    while (usedUsernames.has(username)) username = `${base}-${String(u.id).slice(0, 4)}${i++ > 1 ? i : ''}`;
    usedUsernames.add(username);
    const { first, last } = splitName(u.name);
    await write(
      `INSERT INTO users (id, username, email, password, role, account_status, email_verified, first_name, last_name, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         email=EXCLUDED.email, password=EXCLUDED.password, role=EXCLUDED.role,
         account_status=EXCLUDED.account_status, first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name, updated_at=EXCLUDED.updated_at`,
      [u.id, username, email, u.passwordHash, mapRole(u.role),
       u.active ? 'active' : 'suspended', first, last, u.createdAt, u.updatedAt],
    );
    bump('users');
    if (u.role === 'AFFILIATE') {
      await write(
        `INSERT INTO creator_profiles (user_id, affiliate_tier, created_at, updated_at)
         VALUES ($1,'verified',$2,$3)
         ON CONFLICT (user_id) DO NOTHING`,
        [u.id, u.createdAt, u.updatedAt],
      );
      bump('creator_profiles');
    }
  }
}

async function migratePromoCodes() {
  // Resolve each affiliate's default rate so we can fold the old commission
  // priority (code override ?? affiliate default ?? 0.20) into the code.
  const { rows: users } = await legacy.query(`SELECT id, "defaultCommissionRate" FROM "User"`);
  const defaultRate = new Map<string, number>();
  for (const u of users) defaultRate.set(u.id, Number(u.defaultCommissionRate));

  const { rows } = await legacy.query(
    `SELECT id, code, "affiliateId", "discountPercent", "commissionRateOverride", label, active, "expiresAt", "createdAt"
     FROM "DiscountCode"`,
  );
  for (const c of rows) {
    const effectiveRate =
      c.commissionRateOverride != null ? Number(c.commissionRateOverride)
      : defaultRate.has(c.affiliateId) ? defaultRate.get(c.affiliateId)!
      : DEFAULT_COMMISSION_RATE;
    await write(
      `INSERT INTO promo_codes (id, creator_id, code, status, legacy_discount_percent, legacy_commission_rate, legacy_expires_at, legacy_label, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         status=EXCLUDED.status, legacy_discount_percent=EXCLUDED.legacy_discount_percent,
         legacy_commission_rate=EXCLUDED.legacy_commission_rate, legacy_expires_at=EXCLUDED.legacy_expires_at,
         legacy_label=EXCLUDED.legacy_label`,
      [c.id, c.affiliateId, c.code, c.active ? 'active' : 'paused',
       c.discountPercent, effectiveRate, c.expiresAt, c.label, c.createdAt],
    );
    bump('promo_codes');
  }
}

async function migrateSplits() {
  const { rows } = await legacy.query(
    `SELECT id, "discountCodeId", "recipientUserId", "sharePercent", note, "createdAt", "updatedAt" FROM "CommissionSplit"`,
  );
  for (const s of rows) {
    await write(
      `INSERT INTO legacy_commission_splits (id, promo_code_id, recipient_user_id, share_percent, note, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.discountCodeId, s.recipientUserId, s.sharePercent, s.note, s.createdAt, s.updatedAt],
    );
    bump('commission_splits');
  }
}

async function migratePayouts() {
  const { rows } = await legacy.query(
    `SELECT id, "affiliateId", amount, period, status, notes, "paidAt", "createdAt" FROM "Payout"`,
  );
  for (const p of rows) {
    await write(
      `INSERT INTO creator_payouts (id, creator_id, amount, method, status, reference, notes, paid_at, created_at)
       VALUES ($1,$2,$3,'legacy',$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.affiliateId, p.amount, mapPayoutStatus(p.status), p.period, p.notes, p.paidAt, p.createdAt],
    );
    bump('creator_payouts');
  }
}

async function migrateOrders() {
  const { rows } = await legacy.query(
    `SELECT id, "externalOrderId", "discountCodeId", "customerFirstName", "customerLastName",
            "itemsSummary", "orderTotal", "commissionEarned", attributed, source, "storeName", currency, "createdAt"
     FROM "Order"`,
  );
  for (const o of rows) {
    await write(
      `INSERT INTO legacy_orders (id, external_order_id, promo_code_id, customer_first_name, customer_last_name,
         items_summary, order_total, commission_earned, attributed, source, store_name, currency, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      [o.id, o.externalOrderId, o.discountCodeId, o.customerFirstName, o.customerLastName,
       o.itemsSummary || '', o.orderTotal, o.commissionEarned, o.attributed, o.source || 'shopify',
       o.storeName, (o.currency || 'USD').toUpperCase().slice(0, 3), o.createdAt],
    );
    bump('orders');
    // Project attributed sales into the native dashboard table.
    if (o.attributed && o.discountCodeId) {
      await write(
        `INSERT INTO code_redemptions (id, promo_code_id, vendor_id, sale_amount, commission_amount, redeemed_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [o.id, o.discountCodeId, HOUSE_VENDOR_ID, o.orderTotal, o.commissionEarned, o.createdAt],
      );
      bump('code_redemptions');
    }
  }
}

async function migrateOrderCommissions() {
  const { rows } = await legacy.query(
    `SELECT id, "orderId", "recipientUserId", amount, "sharePercent", "payoutId", "createdAt" FROM "OrderCommission"`,
  );
  for (const c of rows) {
    await write(
      `INSERT INTO legacy_order_commissions (id, order_id, recipient_user_id, amount, share_percent, payout_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [c.id, c.orderId, c.recipientUserId, c.amount, c.sharePercent ?? 1, c.payoutId, c.createdAt],
    );
    bump('order_commissions');
  }
}

async function reconcile() {
  const q = async (pool: Pool, sql: string) => Number((await pool.query(sql)).rows[0].n);
  const legacyCounts = {
    users: await q(legacy, `SELECT count(*) n FROM "User"`),
    promo_codes: await q(legacy, `SELECT count(*) n FROM "DiscountCode"`),
    commission_splits: await q(legacy, `SELECT count(*) n FROM "CommissionSplit"`),
    creator_payouts: await q(legacy, `SELECT count(*) n FROM "Payout"`),
    orders: await q(legacy, `SELECT count(*) n FROM "Order"`),
    order_commissions: await q(legacy, `SELECT count(*) n FROM "OrderCommission"`),
  };
  const legacyOrderTotal = Number((await legacy.query(`SELECT COALESCE(SUM("orderTotal"),0) s FROM "Order"`)).rows[0].s);
  const legacyCommission = Number((await legacy.query(`SELECT COALESCE(SUM(amount),0) s FROM "OrderCommission"`)).rows[0].s);

  console.log('\n================ RECONCILIATION ================');
  console.log(`(mode: ${DRY_RUN ? 'DRY-RUN — nothing written' : 'LIVE'})`);
  console.log('table                  legacy   migrated');
  const map: [string, keyof typeof legacyCounts][] = [
    ['users', 'users'], ['promo_codes', 'promo_codes'], ['commission_splits', 'commission_splits'],
    ['creator_payouts', 'creator_payouts'], ['orders', 'orders'], ['order_commissions', 'order_commissions'],
  ];
  let ok = true;
  for (const [statKey, legKey] of map) {
    const leg = legacyCounts[legKey];
    const mig = stats[statKey] || 0;
    const match = leg === mig ? 'OK' : 'MISMATCH';
    if (leg !== mig) ok = false;
    console.log(`${statKey.padEnd(22)} ${String(leg).padStart(6)}   ${String(mig).padStart(6)}  ${match}`);
  }
  console.log(`\nprojected code_redemptions: ${stats['code_redemptions'] || 0}`);
  console.log(`legacy order total:  $${legacyOrderTotal.toFixed(2)}`);
  console.log(`legacy commission:   $${legacyCommission.toFixed(2)}`);

  if (!DRY_RUN) {
    const newOrderTotal = Number((await target.query(`SELECT COALESCE(SUM(order_total),0) s FROM legacy_orders`)).rows[0].s);
    const newCommission = Number((await target.query(`SELECT COALESCE(SUM(amount),0) s FROM legacy_order_commissions`)).rows[0].s);
    console.log(`migrated order total:$${newOrderTotal.toFixed(2)}  ${Math.abs(newOrderTotal - legacyOrderTotal) < 0.01 ? 'OK' : 'MISMATCH'}`);
    console.log(`migrated commission: $${newCommission.toFixed(2)}  ${Math.abs(newCommission - legacyCommission) < 0.01 ? 'OK' : 'MISMATCH'}`);
    if (Math.abs(newOrderTotal - legacyOrderTotal) >= 0.01 || Math.abs(newCommission - legacyCommission) >= 0.01) ok = false;
  }
  console.log('===============================================');
  console.log(ok ? '✅ Reconciliation passed.' : '❌ Reconciliation found mismatches — review above.');
}

async function main() {
  console.log(`Starting legacy migration${DRY_RUN ? ' (DRY-RUN)' : ''}...`);
  await ensureHouseVendor();
  await migrateUsers();
  await migratePromoCodes();
  await migrateSplits();
  await migratePayouts();          // before order commissions (FK payout_id)
  await migrateOrders();
  await migrateOrderCommissions();
  await reconcile();
  await legacy.end();
  await target.end();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try { await legacy.end(); await target.end(); } catch {}
  process.exit(1);
});
