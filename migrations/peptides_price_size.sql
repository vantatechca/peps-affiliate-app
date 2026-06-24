-- AFFEXCH: add manual price (USD) and vial size to the "Hot Selling Peptides"
-- catalogue. Both are optional and entered by an admin in the offer editor.
-- Idempotent — safe to run more than once.

ALTER TABLE peptides ADD COLUMN IF NOT EXISTS price_usd numeric(10, 2);
ALTER TABLE peptides ADD COLUMN IF NOT EXISTS size varchar(40);
