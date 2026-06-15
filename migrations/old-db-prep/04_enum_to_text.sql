-- ============================================================
-- 04_enum_to_text.sql
-- The app uses lowercase role/status values; the old DB stored them as
-- UPPERCASE enums (Role, PayoutStatus), which makes every lowercase comparison
-- error ("invalid input value for enum"). Convert those two columns to plain
-- text and normalize existing values to the app's native lowercase forms.
-- Idempotent. The old enum types are left in place (harmless, now unused).
-- The storefront integration does not read these columns, so it is unaffected.
-- ============================================================

-- ---- User.role -> text (AFFILIATE->creator, ADMIN/SUPER_ADMIN->admin) ----
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN role TYPE text USING role::text;
UPDATE "User" SET role = CASE role
  WHEN 'AFFILIATE'   THEN 'creator'
  WHEN 'ADMIN'       THEN 'admin'
  WHEN 'SUPER_ADMIN' THEN 'admin'
  ELSE role END;
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'creator';

-- ---- Payout.status -> text (PAID->paid, PENDING->pending, PROCESSING->processing) ----
ALTER TABLE "Payout" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Payout" ALTER COLUMN status TYPE text USING status::text;
UPDATE "Payout" SET status = lower(status);
ALTER TABLE "Payout" ALTER COLUMN status SET DEFAULT 'pending';
