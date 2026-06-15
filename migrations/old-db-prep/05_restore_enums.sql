-- ============================================================
-- 05_restore_enums.sql  (SUPERSEDES / reverses 04_enum_to_text.sql)
-- Both the old app and the new app share this DB. The old app (Prisma) needs
-- "User".role and "Payout".status to be their original enums, so we restore
-- them here. The NEW app maps these enum values in code instead.
-- Re-mark the known super admin first (step 04 had collapsed it to 'admin').
-- Idempotent: every conversion casts via ::text so it works whether the column
-- is currently text (post-04) or already the enum (re-run).
-- ============================================================

-- 1. Restore the super-admin distinction that step 04 flattened.
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'admin@super.com';

-- 2. role -> "Role" enum
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN role TYPE "Role" USING (
  CASE role::text
    WHEN 'creator'     THEN 'AFFILIATE'
    WHEN 'admin'       THEN 'ADMIN'
    WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'
    WHEN 'ADMIN'       THEN 'ADMIN'
    WHEN 'AFFILIATE'   THEN 'AFFILIATE'
    ELSE 'AFFILIATE'
  END
)::"Role";
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'AFFILIATE';

-- 3. Let the new app represent a cancelled payout (old enum lacked it).
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 4. status -> "PayoutStatus" enum
ALTER TABLE "Payout" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Payout" ALTER COLUMN status TYPE "PayoutStatus" USING (upper(status::text))::"PayoutStatus";
ALTER TABLE "Payout" ALTER COLUMN status SET DEFAULT 'PENDING';
