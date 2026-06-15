-- ============================================================
-- 07_creator_payout_methods.sql
-- App-only table for a creator's saved payout destination (PayPal/Interac/
-- crypto/wire). Missing from the old DB (like creator_profiles). Additive +
-- idempotent. Powers /api/affiliate/payout-method and the "How you'll get paid"
-- card on the creator Payouts page.
-- ============================================================
CREATE TABLE IF NOT EXISTS creator_payout_methods (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id  text NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  method      varchar(20) NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_payout_methods_creator ON creator_payout_methods(creator_id);
