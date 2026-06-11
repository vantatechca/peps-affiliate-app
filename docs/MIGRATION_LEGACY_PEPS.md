# Legacy peps_affiliate → AFFEXCH migration

Migrates the old `peps_affiliate` backend (PostgreSQL/Prisma, served at
`rosicteam.com`) into this app, and serves the storefront's existing
`theme.liquid` + `pepscheckoutportal.com` integration unchanged via a
byte-compatible compatibility layer.

## What moves

| Old (`peps_affiliate`) | New (this app) |
| --- | --- |
| `User` (ADMIN/AFFILIATE/SUPER_ADMIN) | `users` (admin/creator) + `creator_profiles` for affiliates |
| `DiscountCode` | `promo_codes` (+ `legacy_discount_percent` / `legacy_commission_rate` / `legacy_expires_at` / `legacy_label`) |
| `CommissionSplit` | `legacy_commission_splits` |
| `Payout` | `creator_payouts` (method = `legacy`) |
| `Order` (all, attributed or not) | `legacy_orders` |
| `OrderCommission` | `legacy_order_commissions` |
| attributed orders (projection) | `code_redemptions` (under the "PEPS House" vendor) |

- Original UUIDs are preserved, so every foreign key lines up and the ETL is
  idempotent (safe to re-run).
- The old `passwordPlain` column is **discarded**. bcrypt hashes copy straight
  across (`bcryptjs` ↔ `bcrypt` are compatible).
- The old per-affiliate/per-code commission priority (code override → affiliate
  default → 0.20) is resolved **once** at migration time into
  `promo_codes.legacy_commission_rate`.

## Compatibility endpoints

Both live under `/api/webhooks/*` and are excluded from the global API rate
limiter (storefront traffic must not be throttled). Point `rosicteam.com` at
this app (thin proxy) so these paths keep serving the 600 stores:

- `GET /api/webhooks/valid-codes` → `{ "<CODE>": { value, type, title } }`, with
  `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=60, s-maxage=60`.
- `POST /api/webhooks/order-paid` → replicates fuzzy code matching, duplicate
  detection, commission priority, split allocation, and the
  `{ success, order_id, attributed, commission_earned, duplicate? }` response.

## Running it

```bash
# 1. Schema bridge (adds promo_codes legacy columns + 3 legacy tables). Idempotent.
npm run migrate:legacy-schema           # uses DATABASE_URL from .env

# 2. Data ETL. Reads the old DB live; writes this app's DB. Idempotent.
LEGACY_DATABASE_URL="postgres://...old-render-db..." \
DATABASE_URL="postgres://...this-app-db..." \
npm run migrate:legacy-data

# Dry run first (reads + reconciles, writes nothing):
LEGACY_DATABASE_URL=... DATABASE_URL=... npm run migrate:legacy-data -- --dry-run
```

The ETL prints a reconciliation report comparing row counts and summed
order/commission totals between the two databases. Verified against the
production snapshot: 69 users, 66 codes, 1081 orders, 137 commission rows,
2 splits, 8 payouts; order total $189,140.23, commission $4,217.49.

## Cutover checklist

1. Run schema bridge against the live app DB.
2. Run the ETL (live old DB → live app DB); confirm reconciliation passes.
3. Diff `GET /api/webhooks/valid-codes` between old and new — must be identical.
4. Replay a sample `order-paid` payload against new; confirm the response shape.
5. Flip the `rosicteam.com` proxy to this app (low DNS TTL; keep old app warm).
6. Re-run the ETL once more after cutover to sweep any in-flight rows
   (idempotent; `external_order_id` dedup prevents double-counting).
7. Rotate the old Render DB credentials.
