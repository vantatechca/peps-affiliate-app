# Legacy PEPS dump → new database (pure SQL import)

Imports the legacy `peps_legacy_dump.sql` (Prisma-era `User` / `DiscountCode` /
`Order` / `OrderCommission` / `CommissionSplit` / `Payout`) into the current app
schema, using only SQL you can paste into the **Neon SQL Editor**. No scripts,
no `psql`, no env vars required.

The legacy tables are **PascalCase** (`"User"`, `"Order"`, …) and the app tables
are **snake_case** (`users`, `legacy_orders`, …), so the staging tables coexist
in the same database without colliding, then get dropped at the end.

## Why not just run the dump?

The original dump loads data with `COPY ... FROM stdin`, a streaming protocol the
web SQL Editor can't run. `01_staging.sql` is the same data rewritten as plain
`INSERT ... VALUES`, so everything runs as ordinary SQL statements.

## Run order (paste each into the Neon SQL Editor, in order)

| Step | File | What it does |
|------|------|--------------|
| 1 | `01_staging.sql`   | Creates `public."User"` … and loads the dump rows (69 / 66 / 2 / 8 / 1081 / 137). |
| 2 | `02_bridge.sql`    | Adds `legacy_*` columns to `promo_codes` and creates `legacy_orders` / `legacy_order_commissions` / `legacy_commission_splits`. Idempotent. |
| 3 | `03_transform.sql` | `INSERT … SELECT` from staging into the real app tables. Idempotent, re-runnable, preserves original IDs. |
| 4 | `04_verify.sql`    | Reconciliation: every row should show `legacy = migrated`, and the dollar totals must match. |
| 5 | `05_cleanup.sql`   | Drops the staging tables. Run only after step 4 is clean. |

## Mapping summary

| Legacy table | → New table(s) |
|---|---|
| `User`            | `users` (+ `creator_profiles` for `AFFILIATE`); `passwordPlain` is dropped |
| `DiscountCode`    | `promo_codes` (rate = override ?? affiliate default ?? 0.20) |
| `CommissionSplit` | `legacy_commission_splits` |
| `Payout`          | `creator_payouts` (`PAID`→`paid`) |
| `Order`           | `legacy_orders` (all), plus `code_redemptions` for attributed orders |
| `OrderCommission` | `legacy_order_commissions` |

Attributed sales (`code_redemptions`) are owned by a synthetic **PEPS House**
vendor (`users`/`vendor_profiles` id `a000…00a1` / `a000…00a2`), since the old
reseller network funnels every store into one checkout.

## Notes / safety

- Take a **Neon branch** before step 3 as a rollback point.
- Steps 2–3 use `IF NOT EXISTS` / `ON CONFLICT`, so the whole thing is safe to
  re-run.
- This logic mirrors the existing `scripts/migrate-from-legacy.ts` ETL; use this
  SQL path when you'd rather work in the SQL editor than run the script.
