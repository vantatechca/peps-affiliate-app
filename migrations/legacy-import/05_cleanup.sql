-- ============================================================
-- 05_cleanup.sql  —  drop the legacy staging tables (run LAST)
-- Only run AFTER 04_verify.sql confirms every row matches.
-- The imported data now lives in the real app tables; staging is disposable.
-- ============================================================
DROP TABLE IF EXISTS public."OrderCommission"  CASCADE;
DROP TABLE IF EXISTS public."CommissionSplit"  CASCADE;
DROP TABLE IF EXISTS public."Order"            CASCADE;
DROP TABLE IF EXISTS public."DiscountCode"     CASCADE;
DROP TABLE IF EXISTS public."Payout"           CASCADE;
DROP TABLE IF EXISTS public."User"             CASCADE;
