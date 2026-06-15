# Old-DB Cutover Blueprint

Goal: run the app **directly on the old `peps_affiliate` database**, sharing the
6 core business tables with the old system (one live dataset), while keeping a
small set of app-only features in new tables added to that same DB.

This is the single source of truth for the rewrite. The DB-prep half is partly
done (PRs #9, #10); the app-code half (schema/storage/routes/client) is pending.

---

## 1. Final table decisions

### REMAP — app concept → old shared table (used live by both systems)
| App (Drizzle) | Old table | Notes |
|---|---|---|
| `users` | `"User"` | shared accounts |
| `promoCodes` | `"DiscountCode"` | custom codes write `code` here |
| `legacyOrders` | `"Order"` | **system of record for sales** |
| `legacyOrderCommissions` | `"OrderCommission"` | per-recipient earnings ledger |
| `legacyCommissionSplits` | `"CommissionSplit"` | per-code split rules |
| `creatorPayouts` | `"Payout"` | payouts |

### KEEP — app-only tables (created in old DB; old system ignores them)
`sessions`, `creator_profiles`, `vendor_profiles`, `audit_logs`,
`notifications`, `reviews`, `conversations`, `messages`.
(Created in PRs #9/#10. `reviews`/`conversations`/`messages` were **redesigned**
to attach to creator↔merchant, since offers/applications are removed.)

### CUT — removed from schema, storage, routes, and client
`offers`, `applications`, `favorites`, `saved_searches`, `analytics`,
`click_events`, `affiliate_sales`, `code_redemptions`, `content_links`,
`niches`, `community_chat_messages`, `creator_payout_methods`,
`creator_wallets`, `wallet_transactions`, `withdrawals`, `company_invoices`,
`content_flags`, `banned_keywords`, `email_templates`,
`retainer_contracts/applications/deliverables/payments`, `system_settings`,
`platform_settings`, `platform_funding_accounts`, `platform_health_snapshots`,
`api_metrics`, `api_error_logs`, `storage_metrics`, `video_hosting_costs`,
`user_notification_preferences`, all `__deprecated_*`.

---

## 2. Sales = the `Order` table (decision)

The storefront's `order-paid` webhook fills `Order` (+ `OrderCommission`), so
**all sales/earnings reads re-point to `Order`/`OrderCommission`**:
- Admin dashboard "Sales + commission", "Top creators/merchants"
- Creator dashboard + `creator-sales`
- Payouts (earnings owed = `OrderCommission` rows not yet linked to a `Payout`)

`code_redemptions` is dropped; the compat layer stops projecting into it.

---

## 3. Column work still needed on the OLD core tables

`"Order"`, `"OrderCommission"`, `"CommissionSplit"` map 1:1 — no changes.
The following additive columns are still required (write as
`migrations/old-db-prep/03_core_table_columns.sql`, additive + idempotent):

**`"DiscountCode"`**
- add `status` text default `'active'`  (app's promo status: active/paused/revoked; old `active` bool stays untouched)

**`"Payout"`**
- add `method` text
- add `reference` text
- add `"paidByUserId"` text REFERENCES `"User"(id)`

---

## 4. Column mappings (Drizzle field → old DB column)

### `users` → `"User"`
`id→id`, `username→username`, `email→email`, **`password→passwordHash`**,
`googleId→googleId`, `firstName→firstName`, `lastName→lastName`,
`profileImageUrl→profileImageUrl`, `role→role`, `accountStatus→accountStatus`,
`emailVerified→emailVerified`, token/OTP/2FA + consent fields → same camelCase
columns added in PR #9, `createdAt→createdAt`, `updatedAt→updatedAt`.
- Old `name` is **NOT NULL** → `storage.createUser` must set it (e.g.
  `firstName + ' ' + lastName`, or username).
- Old `defaultCommissionRate` is reused for commission resolution (below).

### `promoCodes` → `"DiscountCode"`
`id→id`, **`creatorId→affiliateId`**, `code→code`, `status→status` (new col),
`legacyDiscountPercent→discountPercent`,
`legacyCommissionRate→commissionRateOverride`,
`legacyExpiresAt→expiresAt`, `legacyLabel→label`, `createdAt→createdAt`.
- Drop `applicationId` (offers/applications are cut).

### `legacyOrders` → `"Order"`
`id→id`, `externalOrderId→externalOrderId`, **`promoCodeId→discountCodeId`**,
`customerFirstName→customerFirstName`, `customerLastName→customerLastName`,
`itemsSummary→itemsSummary`, `orderTotal→orderTotal`,
`commissionEarned→commissionEarned`, `attributed→attributed`,
`source→source`, `storeName→storeName`, `currency→currency`,
`createdAt→createdAt`.

### `legacyOrderCommissions` → `"OrderCommission"`
`id→id`, `orderId→orderId`, `recipientUserId→recipientUserId`,
`amount→amount`, `sharePercent→sharePercent`, `payoutId→payoutId`,
`createdAt→createdAt`.

### `legacyCommissionSplits` → `"CommissionSplit"`
`id→id`, **`promoCodeId→discountCodeId`**,
`recipientUserId→recipientUserId`, `sharePercent→sharePercent`,
`note→note`, `createdAt→createdAt`, `updatedAt→updatedAt`.

### `creatorPayouts` → `"Payout"`
`id→id`, **`creatorId→affiliateId`**, `amount→amount`, `method→method` (new),
`status→status`, `reference→reference` (new), `notes→notes`,
`paidByUserId→paidByUserId` (new), `paidAt→paidAt`, `createdAt→createdAt`.

---

## 5. Value mappings handled in app code (not the DB)

- **Role**: old `"User".role` enum is `AFFILIATE | ADMIN | SUPER_ADMIN`.
  App maps: `AFFILIATE` ⇄ affiliate/creator role; `ADMIN`/`SUPER_ADMIN` ⇄ admin.
  Keep storing the old enum values so the old system stays consistent.
- **Payout status**: old `PayoutStatus` (`PENDING|PROCESSING|PAID`) ⇄ app
  `pending|paid` (`PAID`→paid, else pending).
- **Promo status**: app `active|paused|revoked` in the new `status` column.
- **Commission rate** (for a code): `commissionRateOverride ?? User.defaultCommissionRate ?? 0.20` (same as the existing compat layer).

---

## 6. App-code change list

### `shared/schema.ts`
- Repoint the 6 REMAP tables to old names + mapped columns (above).
- Update `creatorProfiles`/`vendorProfiles`/`auditLogs`/`notifications` to the
  text-id new-table shape; redesign `reviews`/`conversations`/`messages`
  (drop `applicationId`/`offerId`, add `merchantId`).
- Delete all CUT tables, their `relations`, `createInsertSchema` exports, and
  exported types. Fix every import that referenced them.

### `server/storage.ts` (7,123 lines)
- Remove every method for CUT features (offers, applications, favorites,
  analytics, clicks, wallet, retainers, content links, etc.).
- Rewrite sales/earnings/payout reads against `Order`/`OrderCommission`.
- `createUser`: populate old `name` NOT NULL; apply role mapping.
- Reviews/messaging methods: creator↔merchant shape.

### `server/routes.ts`, `server/affexchRoutes.ts`, `server/legacyCompatRoutes.ts`
- Delete offer/application/tracking/wallet/retainer/content-link endpoints.
- Re-point dashboard/analytics/creator-sales/payout endpoints to `Order`.
- Compat layer: keep `valid-codes` + `order-paid`; stop the `code_redemptions`
  projection.

### `client/src/**`
- Remove pages/components for CUT features (most already deleted by PRs #7/#8;
  remove remaining dead imports/queries).

### Config
- Point `DATABASE_URL` at the old DB. `server/db.ts` driver stays
  (node-postgres / Neon serverless both speak plain Postgres).

---

## 7. Sequencing
1. ✅ `01_prepare_old_db.sql` — User columns + new tables (PR #9)
2. ✅ `02_creator_profiles.sql` (PR #10)
3. ⬜ `03_core_table_columns.sql` — DiscountCode/Payout columns (§3)
4. ⬜ Schema rewrite (§6) → `tsc` green
5. ⬜ storage.ts rewrite → `tsc` green
6. ⬜ routes + client cleanup → build green
7. ⬜ Runtime test on a **staging copy** of the old DB (cannot be done from CI)
8. ⬜ Flip `DATABASE_URL`; keep old system warm; verify shared writes both ways

## 8. Risks / notes
- The §4–6 rewrite is one atomic change (~9k lines); it won't compile in
  partial states, so it lands as a single cohesive PR when `tsc` is green.
- **Runtime behavior can't be verified in this environment** — staging test
  (step 7) is mandatory before flipping production.
- Cutting `platform_settings`/`system_settings` means any fee/config they held
  becomes a code constant — confirm the few values before removing.
- All old-DB changes are additive; the old system keeps running throughout.
  Back up the old DB before applying step 3 and before the cutover.
