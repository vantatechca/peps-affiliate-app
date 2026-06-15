-- ============================================================
-- 02_bridge.sql  —  schema bridge (run SECOND)
-- Targets the LIVE schema: uuid primary keys (not varchar).
-- Idempotent for the promo_codes columns; recreates the legacy_* tables
-- (safe: they only hold imported data, which 03_transform repopulates).
-- ============================================================

-- ---- promo_codes: legacy economics columns ----
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_discount_percent numeric(5,4);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_commission_rate  numeric(5,4);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_expires_at       timestamp;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_label            varchar;

-- ---- legacy_* tables (uuid keys to match the live schema) ----
DROP TABLE IF EXISTS legacy_order_commissions CASCADE;
DROP TABLE IF EXISTS legacy_commission_splits CASCADE;
DROP TABLE IF EXISTS legacy_orders CASCADE;

CREATE TABLE legacy_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id   varchar,
  promo_code_id       uuid REFERENCES promo_codes(id) ON DELETE SET NULL,
  customer_first_name varchar NOT NULL,
  customer_last_name  varchar,
  items_summary       text NOT NULL DEFAULT '',
  order_total         numeric(12,2) NOT NULL,
  commission_earned   numeric(12,2) NOT NULL DEFAULT 0,
  attributed          boolean NOT NULL DEFAULT false,
  source              varchar NOT NULL DEFAULT 'shopify',
  store_name          varchar,
  currency            varchar(3) NOT NULL DEFAULT 'USD',
  created_at          timestamp DEFAULT now()
);
CREATE INDEX idx_legacy_orders_external_id ON legacy_orders(external_order_id);
CREATE INDEX idx_legacy_orders_promo_code  ON legacy_orders(promo_code_id);
CREATE INDEX idx_legacy_orders_created_at  ON legacy_orders(created_at);

CREATE TABLE legacy_order_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES legacy_orders(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            numeric(12,2) NOT NULL,
  share_percent     numeric(6,5) NOT NULL DEFAULT 1,
  payout_id         uuid REFERENCES creator_payouts(id) ON DELETE SET NULL,
  created_at        timestamp DEFAULT now()
);
CREATE INDEX idx_legacy_order_commissions_order     ON legacy_order_commissions(order_id);
CREATE INDEX idx_legacy_order_commissions_recipient ON legacy_order_commissions(recipient_user_id);
CREATE INDEX idx_legacy_order_commissions_payout    ON legacy_order_commissions(payout_id);

CREATE TABLE legacy_commission_splits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id     uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_percent     numeric(6,5) NOT NULL,
  note              text,
  created_at        timestamp DEFAULT now(),
  updated_at        timestamp DEFAULT now()
);
CREATE INDEX idx_legacy_commission_splits_promo_code ON legacy_commission_splits(promo_code_id);
CREATE INDEX idx_legacy_commission_splits_recipient  ON legacy_commission_splits(recipient_user_id);
