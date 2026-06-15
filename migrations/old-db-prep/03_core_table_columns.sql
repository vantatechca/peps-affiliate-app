-- ============================================================
-- 03_core_table_columns.sql
-- Final additive prep on the OLD core tables so the app's promo-code and
-- payout features have a home. Additive + idempotent; the old system is
-- unaffected (it keeps using DiscountCode.active and Payout.status as before).
-- ============================================================

-- ---- DiscountCode: app promo status (active | paused | revoked) ----
ALTER TABLE "DiscountCode" ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Seed status from the old `active` flag for existing codes.
UPDATE "DiscountCode"
SET status = CASE WHEN active THEN 'active' ELSE 'paused' END
WHERE status = 'active';   -- only rows still at the column default

-- ---- Payout: app payout fields ----
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS method        text;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS reference     text;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidByUserId" text REFERENCES "User"(id) ON DELETE SET NULL;

-- Tag historical payouts as legacy so the app can distinguish them.
UPDATE "Payout" SET method = 'legacy' WHERE method IS NULL;
