-- ============================================================
-- 06_id_defaults.sql
-- The old Prisma tables generate `id` in application code, so their id columns
-- have NO database default. The new app inserts via Drizzle without supplying
-- an id (promo codes, payouts, webhook orders/commissions), which fails with
-- "null value in column id". Add a DB-side default so those inserts work.
-- Additive + idempotent; the old app keeps supplying its own ids (default unused).
-- ============================================================
ALTER TABLE "User"             ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "DiscountCode"     ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Order"            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "OrderCommission"  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "CommissionSplit"  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Payout"           ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Prisma's @updatedAt columns are NOT NULL with no DB default (Prisma set them
-- in code). Give them now() defaults so Drizzle inserts that omit updatedAt work.
ALTER TABLE "User"             ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "DiscountCode"     ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "CommissionSplit"  ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "Payout"           ALTER COLUMN "updatedAt" SET DEFAULT now();
