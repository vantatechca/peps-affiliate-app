-- ============================================================
-- 03_transform.sql  —  legacy staging -> new app tables (run THIRD)
-- Run AFTER 01_staging.sql and 02_bridge.sql.
-- Pure INSERT ... SELECT. Idempotent (ON CONFLICT) and re-runnable.
-- Original IDs are preserved so every foreign key lines up.
-- Mapping mirrors scripts/migrate-from-legacy.ts.
-- ============================================================
BEGIN;

-- ---- Synthetic "PEPS House" vendor (owns projected code_redemptions) ----
-- The old reseller network funnels every store into one checkout, so attributed
-- sales are attached to a single house vendor.
INSERT INTO users (id, username, email, password, role, account_status, email_verified, first_name, last_name)
VALUES ('a0000000-0000-4000-8000-0000000000a1', 'peps-house', 'house@peps.local', NULL,
        'company', 'active', true, 'PEPS', 'House')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_profiles (id, user_id, legal_name, trade_name, website_verified, status)
VALUES ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000a1',
        'PEPS House', 'PEPS', true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- ---- User -> users ----
-- username = email local-part (sanitized); duplicates get an id-suffix.
-- passwordPlain is intentionally NOT copied. ADMIN/SUPER_ADMIN -> admin; AFFILIATE -> creator.
WITH ranked AS (
  SELECT
    u.id,
    lower(u.email)                                                   AS email_l,
    u."passwordHash"                                                 AS password_hash,
    u.role                                                           AS legacy_role,
    u.active                                                         AS active,
    u."createdAt"                                                    AS created_at,
    u."updatedAt"                                                    AS updated_at,
    split_part(trim(u.name), ' ', 1)                                 AS first_name,
    NULLIF(regexp_replace(trim(u.name), '^[^[:space:]]+[[:space:]]*', ''), '') AS last_name,
    COALESCE(NULLIF(regexp_replace(split_part(lower(u.email), '@', 1),
             '[^a-z0-9._-]', '', 'g'), ''), 'user')                 AS base,
    row_number() OVER (
      PARTITION BY COALESCE(NULLIF(regexp_replace(split_part(lower(u.email), '@', 1),
                   '[^a-z0-9._-]', '', 'g'), ''), 'user')
      ORDER BY u.id)                                                 AS rn
  FROM public."User" u
)
INSERT INTO users (id, username, email, password, role, account_status,
                   email_verified, first_name, last_name, created_at, updated_at)
SELECT
  id,
  CASE WHEN rn = 1 THEN base ELSE base || '-' || substr(id, 1, 4) END,
  email_l,
  password_hash,
  (CASE WHEN legacy_role = 'AFFILIATE' THEN 'creator' ELSE 'admin' END)::user_role,
  (CASE WHEN active THEN 'active' ELSE 'suspended' END)::user_account_status,
  true,
  first_name,
  last_name,
  created_at,
  updated_at
FROM ranked
ON CONFLICT (id) DO UPDATE SET
  email          = EXCLUDED.email,
  password       = EXCLUDED.password,
  role           = EXCLUDED.role,
  account_status = EXCLUDED.account_status,
  first_name     = EXCLUDED.first_name,
  last_name      = EXCLUDED.last_name,
  updated_at     = EXCLUDED.updated_at;

-- ---- User (AFFILIATE) -> creator_profiles ----
INSERT INTO creator_profiles (user_id, affiliate_tier, created_at, updated_at)
SELECT id, 'verified'::affiliate_tier, "createdAt", "updatedAt"
FROM public."User"
WHERE role = 'AFFILIATE'
ON CONFLICT (user_id) DO NOTHING;

-- ---- DiscountCode -> promo_codes ----
-- effective commission rate = code override ?? affiliate default ?? 0.20
INSERT INTO promo_codes (id, creator_id, code, status,
                         legacy_discount_percent, legacy_commission_rate,
                         legacy_expires_at, legacy_label, created_at)
SELECT
  d.id,
  d."affiliateId",
  d.code,
  (CASE WHEN d.active THEN 'active' ELSE 'paused' END)::promo_code_status,
  d."discountPercent",
  COALESCE(d."commissionRateOverride", u."defaultCommissionRate", 0.20),
  d."expiresAt",
  d.label,
  d."createdAt"
FROM public."DiscountCode" d
LEFT JOIN public."User" u ON u.id = d."affiliateId"
ON CONFLICT (id) DO UPDATE SET
  status                  = EXCLUDED.status,
  legacy_discount_percent = EXCLUDED.legacy_discount_percent,
  legacy_commission_rate  = EXCLUDED.legacy_commission_rate,
  legacy_expires_at       = EXCLUDED.legacy_expires_at,
  legacy_label            = EXCLUDED.legacy_label;

-- ---- CommissionSplit -> legacy_commission_splits ----
INSERT INTO legacy_commission_splits (id, promo_code_id, recipient_user_id,
                                      share_percent, note, created_at, updated_at)
SELECT id, "discountCodeId", "recipientUserId", "sharePercent", note, "createdAt", "updatedAt"
FROM public."CommissionSplit"
ON CONFLICT (id) DO NOTHING;

-- ---- Payout -> creator_payouts (PAID -> paid, else pending) ----
INSERT INTO creator_payouts (id, creator_id, amount, method, status,
                             reference, notes, paid_at, created_at)
SELECT
  id, "affiliateId", amount, 'legacy',
  CASE WHEN status = 'PAID' THEN 'paid' ELSE 'pending' END,
  period, notes, "paidAt", "createdAt"
FROM public."Payout"
ON CONFLICT (id) DO NOTHING;

-- ---- Order -> legacy_orders (ALL orders, attributed or not) ----
INSERT INTO legacy_orders (id, external_order_id, promo_code_id,
                           customer_first_name, customer_last_name, items_summary,
                           order_total, commission_earned, attributed, source,
                           store_name, currency, created_at)
SELECT
  id,
  "externalOrderId",
  "discountCodeId",
  COALESCE("customerFirstName", 'Unknown'),
  "customerLastName",
  COALESCE("itemsSummary", ''),
  "orderTotal",
  "commissionEarned",
  attributed,
  COALESCE(source, 'shopify'),
  "storeName",
  upper(left(COALESCE(currency, 'USD'), 3)),
  "createdAt"
FROM public."Order"
ON CONFLICT (id) DO NOTHING;

-- ---- Order (attributed) -> code_redemptions (native dashboard) ----
INSERT INTO code_redemptions (id, promo_code_id, vendor_id,
                              sale_amount, commission_amount, redeemed_at)
SELECT
  id,
  "discountCodeId",
  'a0000000-0000-4000-8000-0000000000a2',
  "orderTotal",
  "commissionEarned",
  "createdAt"
FROM public."Order"
WHERE attributed = true AND "discountCodeId" IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ---- OrderCommission -> legacy_order_commissions ----
INSERT INTO legacy_order_commissions (id, order_id, recipient_user_id,
                                      amount, share_percent, payout_id, created_at)
SELECT id, "orderId", "recipientUserId", amount, COALESCE("sharePercent", 1),
       "payoutId", "createdAt"
FROM public."OrderCommission"
ON CONFLICT (id) DO NOTHING;

COMMIT;
