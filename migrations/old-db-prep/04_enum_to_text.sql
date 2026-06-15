-- ============================================================
-- 04_enum_to_text.sql  — SUPERSEDED, intentionally a no-op.
-- This step converted "User".role / "Payout".status to text, which broke the
-- OLD app (it needs the original enums). It has been replaced by
-- 05_restore_enums.sql. Do NOT apply this; kept only for history.
-- ============================================================
SELECT 1;
