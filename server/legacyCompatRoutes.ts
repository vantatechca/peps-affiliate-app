// ============================================================
// Legacy peps_affiliate API compatibility layer
// ============================================================
// The 600 live Shopify stores run an un-updatable theme.liquid script, and the
// pepscheckoutportal.com checkout POSTs orders, both hitting the OLD backend at
// rosicteam.com. After cutover, rosicteam.com proxies these two paths to THIS app,
// so the request/response payloads here must mirror the old backend byte-for-byte.
//
//   GET  /api/webhooks/valid-codes  — consumed by theme.liquid (600 stores)
//   POST /api/webhooks/order-paid   — consumed by pepscheckoutportal.com
//
// Backed by the legacy_* tables + promo_codes legacy columns (see migrations/
// legacy_peps_migration.sql). Attributed orders are also projected into
// code_redemptions so they appear in the new dashboard.
//
// NOTE: these routes are intentionally excluded from the global /api rate limiter
// (see server/index.ts) — storefront traffic would otherwise be throttled.

import type { Express, Request, Response } from "express";
import { db, pool } from "./db";
import { promoCodes, users } from "../shared/schema";
import { and, eq, isNotNull } from "drizzle-orm";

// House vendor that owns projected redemptions (created by scripts/migrate-from-legacy.ts).
const HOUSE_VENDOR_ID = "a0000000-0000-4000-8000-0000000000a2";
const DEFAULT_COMMISSION_RATE = 0.2;

export function registerLegacyCompatRoutes(app: Express) {
  // ---- GET /api/webhooks/valid-codes -------------------------------------
  // Mirrors the old shape exactly:
  //   { "<CODE>": { value: "10.0", type: "percentage", title: "10% Off" }, ... }
  // Only active codes whose creator is active and which haven't expired.
  app.get("/api/webhooks/valid-codes", async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select({
          code: promoCodes.code,
          discountPercent: promoCodes.legacyDiscountPercent,
          expiresAt: promoCodes.legacyExpiresAt,
          accountStatus: users.accountStatus,
        })
        .from(promoCodes)
        .innerJoin(users, eq(promoCodes.creatorId, users.id))
        .where(and(eq(promoCodes.status, "active"), isNotNull(promoCodes.legacyDiscountPercent)));

      const now = new Date();
      const valid: Record<string, { value: string; type: "percentage"; title: string }> = {};
      for (const r of rows) {
        if (r.accountStatus !== "active") continue;
        if (r.expiresAt && new Date(r.expiresAt) < now) continue;
        const pct = Number(r.discountPercent) * 100;
        valid[r.code] = {
          value: pct.toFixed(1),
          type: "percentage",
          title: `${pct.toFixed(0)}% Off`,
        };
      }

      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cache-Control", "public, max-age=60, s-maxage=60");
      res.json(valid);
    } catch (error) {
      console.error("[legacy-compat] valid-codes error:", error);
      res.status(500).json({});
    }
  });

  // ---- POST /api/webhooks/order-paid -------------------------------------
  // Mirrors the old webhook: fuzzy code match, dedup, commission priority and
  // split allocation, writing to legacy_orders + legacy_order_commissions.
  app.post("/api/webhooks/order-paid", async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const {
        customer_first_name,
        customer_last_name,
        items_summary,
        order_total,
        discount_code,
        source = "shopify",
        store_name,
        source_store,
        currency = "USD",
        external_order_id,
      } = req.body || {};

      if (!customer_first_name || order_total == null || order_total === "") {
        return res.status(400).json({ error: "customer_first_name and order_total are required" });
      }
      const orderTotal = parseFloat(order_total);

      // ---- Duplicate detection (mirrors old logic) ----
      if (external_order_id) {
        const dup = await client.query(
          `SELECT id, attributed, commission_earned FROM legacy_orders WHERE external_order_id = $1 LIMIT 1`,
          [external_order_id],
        );
        if (dup.rows.length) {
          const e = dup.rows[0];
          return res.json({
            success: true, order_id: e.id, attributed: e.attributed,
            commission_earned: Number(e.commission_earned), duplicate: true,
          });
        }
      } else {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const dup = await client.query(
          `SELECT id, attributed, commission_earned FROM legacy_orders
           WHERE customer_first_name = $1 AND order_total = $2 AND source = $3 AND created_at >= $4 LIMIT 1`,
          [customer_first_name, orderTotal, source, fiveMinAgo],
        );
        if (dup.rows.length) {
          const e = dup.rows[0];
          return res.json({
            success: true, order_id: e.id, attributed: e.attributed,
            commission_earned: Number(e.commission_earned), duplicate: true,
          });
        }
      }

      // ---- Discount-code lookup (exact -> partial -> embedded) ----
      let codeRow: any = null;
      if (discount_code) {
        const codeToFind = String(discount_code).trim().toUpperCase();
        const baseSelect = `
          SELECT p.id, p.code, p.status, p.legacy_commission_rate, p.legacy_expires_at,
                 p.creator_id, u.account_status
          FROM promo_codes p JOIN users u ON u.id = p.creator_id `;

        // exact (case-insensitive)
        let r = await client.query(baseSelect + `WHERE UPPER(p.code) = $1 LIMIT 1`, [codeToFind]);
        // partial: stored code contained in the incoming string, or vice-versa
        if (!r.rows.length) {
          r = await client.query(baseSelect + `WHERE UPPER(p.code) LIKE '%' || $1 || '%' LIMIT 1`, [codeToFind]);
        }
        if (!r.rows.length) {
          const all = await client.query(baseSelect);
          for (const c of all.rows) {
            if (codeToFind.includes(String(c.code).toUpperCase())) { codeRow = c; break; }
          }
        } else {
          codeRow = r.rows[0];
        }
      }

      // ---- Attribution + commission ----
      let attributed = false;
      let commissionEarned = 0;
      if (codeRow) {
        const isActive = codeRow.status === "active";
        const notExpired = !codeRow.legacy_expires_at || new Date(codeRow.legacy_expires_at) > new Date();
        const creatorActive = codeRow.account_status === "active";
        if (isActive && notExpired && creatorActive) {
          attributed = true;
          const rate = codeRow.legacy_commission_rate != null
            ? Number(codeRow.legacy_commission_rate) : DEFAULT_COMMISSION_RATE;
          commissionEarned = parseFloat((orderTotal * rate).toFixed(2));
        }
      }

      // ---- Build per-recipient allocations (splits or single affiliate) ----
      type Alloc = { recipientUserId: string; amount: number; sharePercent: number };
      const allocations: Alloc[] = [];
      if (attributed && codeRow && commissionEarned > 0) {
        const splits = await client.query(
          `SELECT recipient_user_id, share_percent FROM legacy_commission_splits WHERE promo_code_id = $1`,
          [codeRow.id],
        );
        if (splits.rows.length) {
          let remaining = commissionEarned;
          splits.rows.forEach((s: any, i: number) => {
            const isLast = i === splits.rows.length - 1;
            const amount = isLast ? parseFloat(remaining.toFixed(2))
              : parseFloat((commissionEarned * Number(s.share_percent)).toFixed(2));
            remaining = parseFloat((remaining - amount).toFixed(2));
            allocations.push({ recipientUserId: s.recipient_user_id, amount, sharePercent: Number(s.share_percent) });
          });
        } else {
          allocations.push({ recipientUserId: codeRow.creator_id, amount: commissionEarned, sharePercent: 1 });
        }
      }

      // ---- Persist (transaction) ----
      await client.query("BEGIN");
      const orderRes = await client.query(
        `INSERT INTO legacy_orders
           (external_order_id, promo_code_id, customer_first_name, customer_last_name,
            items_summary, order_total, commission_earned, attributed, source, store_name, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [external_order_id || null, codeRow?.id || null, customer_first_name, customer_last_name || null,
         items_summary || "", orderTotal, commissionEarned, attributed, source,
         source_store || store_name || null, String(currency).toUpperCase().slice(0, 3)],
      );
      const orderId = orderRes.rows[0].id;

      for (const a of allocations) {
        await client.query(
          `INSERT INTO legacy_order_commissions (order_id, recipient_user_id, amount, share_percent)
           VALUES ($1,$2,$3,$4)`,
          [orderId, a.recipientUserId, a.amount, a.sharePercent],
        );
      }

      // Project attributed sale into the native dashboard table (best-effort).
      if (attributed && codeRow) {
        const houseVendor = await client.query(`SELECT 1 FROM vendor_profiles WHERE id = $1`, [HOUSE_VENDOR_ID]);
        if (houseVendor.rows.length) {
          await client.query(
            `INSERT INTO code_redemptions (promo_code_id, vendor_id, sale_amount, commission_amount)
             VALUES ($1,$2,$3,$4)`,
            [codeRow.id, HOUSE_VENDOR_ID, orderTotal, commissionEarned],
          );
        }
      }
      await client.query("COMMIT");

      res.json({ success: true, order_id: orderId, attributed, commission_earned: commissionEarned });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      console.error("[legacy-compat] order-paid error:", error);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });
}
