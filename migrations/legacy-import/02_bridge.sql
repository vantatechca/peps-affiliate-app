-- Legacy peps_affiliate migration — schema bridge
-- Idempotent: safe to run multiple times.
--
-- Adds per-code economics to promo_codes (the old flat DiscountCode model carried
-- discount % + commission % on the code itself) and creates the three legacy tables
-- that mirror the old Order / OrderCommission / CommissionSplit models so the
-- storefront integration (theme.liquid + pepscheckoutportal.com via /api/webhooks/*)
-- behaves byte-for-byte like the old backend.

-- ---- promo_codes: legacy economics columns ----
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_discount_percent numeric(5,4);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_commission_rate numeric(5,4);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_expires_at timestamp;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS legacy_label varchar;

-- ---- legacy_orders: system of record for ALL orders (attributed or not) ----
CREATE TABLE IF NOT EXISTS legacy_orders (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id varchar,
  promo_code_id varchar REFERENCES promo_codes(id) ON DELETE SET NULL,
  customer_first_name varchar NOT NULL,
  customer_last_name varchar,
  items_summary text NOT NULL DEFAULT '',
  order_total numeric(12,2) NOT NULL,
  commission_earned numeric(12,2) NOT NULL DEFAULT '0',
  attributed boolean NOT NULL DEFAULT false,
  source varchar NOT NULL DEFAULT 'shopify',
  store_name varchar,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_external_id ON legacy_orders(external_order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_promo_code ON legacy_orders(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_legacy_orders_created_at ON legacy_orders(created_at);

-- ---- legacy_order_commissions: per-recipient ledger ----
CREATE TABLE IF NOT EXISTS legacy_order_commissions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES legacy_orders(id) ON DELETE CASCADE,
  recipient_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  share_percent numeric(6,5) NOT NULL DEFAULT '1',
  payout_id varchar REFERENCES creator_payouts(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_order_commissions_order ON legacy_order_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_order_commissions_recipient ON legacy_order_commissions(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_order_commissions_payout ON legacy_order_commissions(payout_id);

-- ---- legacy_commission_splits: per-code split rules ----
CREATE TABLE IF NOT EXISTS legacy_commission_splits (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id varchar NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  recipient_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_percent numeric(6,5) NOT NULL,
  note text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_commission_splits_promo_code ON legacy_commission_splits(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_legacy_commission_splits_recipient ON legacy_commission_splits(recipient_user_id);
