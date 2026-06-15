-- ============================================================
-- 03_transform.sql  —  legacy staging -> new app tables (run THIRD)
-- Run AFTER 01_staging.sql and 02_bridge.sql.
-- Targets the LIVE schema:
--   * ids are uuid          -> staging text ids are cast with ::uuid
--   * users.role / account_status are varchar (NOT enums) -> plain text
--   * users.created_at / updated_at are NOT NULL w/o default -> always supplied
-- Idempotent (ON CONFLICT / NOT EXISTS) and re-runnable. IDs are preserved.
-- ============================================================
BEGIN;

-- ---- Synthetic "PEPS House" vendor (owns projected code_redemptions) ----
INSERT INTO users (id, username, email, password, role, account_status,
                   email_verified, first_name, last_name, created_at, updated_at)
VALUES ('a0000000-0000-4000-8000-0000000000a1'::uuid, 'peps-house', 'house@peps.local', NULL,
        'company', 'active', true, 'PEPS', 'House', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_profiles (id, user_id, legal_name, trade_name, website_verified, status)
VALUES ('a0000000-0000-4000-8000-0000000000a2'::uuid, 'a0000000-0000-4000-8000-0000000000a1'::uuid,
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
),
named AS (
  SELECT r.*,
    -- Keep the clean base username only when it is the first in the batch AND
    -- not already taken by an existing production user; otherwise suffix with the
    -- (unique) legacy id so the result is collision-proof and deterministic.
    CASE
      WHEN rn = 1
       AND NOT EXISTS (SELECT 1 FROM users ex WHERE ex.username = r.base)
        THEN r.base
      ELSE r.base || '-' || left(translate(r.id, '-', ''), 8)
    END                                                              AS username
  FROM ranked r
)
INSERT INTO users (id, username, email, password, role, account_status,
                   email_verified, first_name, last_name, created_at, updated_at)
SELECT
  id::uuid,
  username,
  email_l,
  password_hash,
  CASE WHEN legacy_role = 'AFFILIATE' THEN 'creator' ELSE 'admin' END,
  CASE WHEN active THEN 'active' ELSE 'suspended' END,
  true,
  first_name,
  last_name,
  created_at,
  updated_at
FROM named
ON CONFLICT (id) DO UPDATE SET
  email          = EXCLUDED.email,
  password       = EXCLUDED.password,
  role           = EXCLUDED.role,
  account_status = EXCLUDED.account_status,
  first_name     = EXCLUDED.first_name,
  last_name      = EXCLUDED.last_name,
  updated_at     = EXCLUDED.updated_at;

-- ---- User (AFFILIATE) -> creator_profiles ----
-- NOT EXISTS guard (no assumption about a unique constraint on user_id).
INSERT INTO creator_profiles (user_id, affiliate_tier, created_at, updated_at)
SELECT u.id::uuid, 'verified'::affiliate_tier, u."createdAt", u."updatedAt"
FROM public."User" u
WHERE u.role = 'AFFILIATE'
  AND NOT EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.user_id = u.id::uuid);

-- ---- DiscountCode -> promo_codes ----
-- effective commission rate = code override ?? affiliate default ?? 0.20
INSERT INTO promo_codes (id, creator_id, code, status,
                         legacy_discount_percent, legacy_commission_rate,
                         legacy_expires_at, legacy_label, created_at)
SELECT
  d.id::uuid,
  d."affiliateId"::uuid,
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
SELECT id::uuid, "discountCodeId"::uuid, "recipientUserId"::uuid,
       "sharePercent", note, "createdAt", "updatedAt"
FROM public."CommissionSplit"
ON CONFLICT (id) DO NOTHING;

-- ---- Payout -> creator_payouts (PAID -> paid, else pending) ----
INSERT INTO creator_payouts (id, creator_id, amount, method, status,
                             reference, notes, paid_at, created_at)
SELECT
  id::uuid, "affiliateId"::uuid, amount, 'legacy',
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
  id::uuid,
  "externalOrderId",
  "discountCodeId"::uuid,
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
  id::uuid,
  "discountCodeId"::uuid,
  'a0000000-0000-4000-8000-0000000000a2'::uuid,
  "orderTotal",
  "commissionEarned",
  "createdAt"
FROM public."Order"
WHERE attributed = true AND "discountCodeId" IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ---- OrderCommission -> legacy_order_commissions ----
INSERT INTO legacy_order_commissions (id, order_id, recipient_user_id,
                                      amount, share_percent, payout_id, created_at)
SELECT id::uuid, "orderId"::uuid, "recipientUserId"::uuid, amount,
       COALESCE("sharePercent", 1), "payoutId"::uuid, "createdAt"
FROM public."OrderCommission"
ON CONFLICT (id) DO NOTHING;

COMMIT;
