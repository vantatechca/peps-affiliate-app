-- ============================================================
-- run_all.sql — COMPLETE, self-contained old-DB prep (steps 1,2,3,5,6,7).
-- Additive + idempotent: safe to run and re-run against the old database.
-- The old app keeps working untouched.
--
-- Run it ONE of these ways (do NOT use --single-transaction; step 5 runs
-- ALTER TYPE ... ADD VALUE which can't be inside a transaction block):
--   psql "$OLD_DATABASE_URL" -f run_all.sql
--   -- or paste this whole file into an interactive psql session.
-- ============================================================

-- ========================= STEP 1: User columns + app tables =========================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS username                     text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName"                  text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName"                   text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImageUrl"            text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId"                   text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus"             text    NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified"             boolean NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken"     text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken"         text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiry"   timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountDeletionOtp"         text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountDeletionOtpExpiry"   timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangeOtp"          text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangeOtpExpiry"    timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret"            text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled"           boolean NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes"       text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tosAcceptedAt"              timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt"          timestamp;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cookieConsentAt"            timestamp;

WITH ranked AS (
  SELECT id,
         COALESCE(NULLIF(regexp_replace(split_part(lower(email), '@', 1),
                  '[^a-z0-9._-]', '', 'g'), ''), 'user') AS base,
         row_number() OVER (
           PARTITION BY COALESCE(NULLIF(regexp_replace(split_part(lower(email), '@', 1),
                        '[^a-z0-9._-]', '', 'g'), ''), 'user')
           ORDER BY id) AS rn
  FROM "User"
  WHERE username IS NULL
)
UPDATE "User" u
SET username = CASE WHEN r.rn = 1 THEN r.base
                    ELSE r.base || '-' || left(replace(u.id, '-', ''), 8) END
FROM ranked r
WHERE u.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username ON "User"(username);

CREATE TABLE IF NOT EXISTS sessions (
  sid    varchar PRIMARY KEY,
  sess   jsonb     NOT NULL,
  expire timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id                            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                       text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  legal_name                    text NOT NULL,
  trade_name                    text,
  industry                      text,
  website_url                   text,
  company_size                  text,
  year_founded                  integer,
  logo_url                      text,
  description                   text,
  contact_name                  text,
  contact_job_title             text,
  phone_number                  text,
  business_address              text,
  city                          text,
  country                       text,
  verification_document_url     text,
  linkedin_url                  text,
  twitter_url                   text,
  facebook_url                  text,
  instagram_url                 text,
  website_verification_token    text,
  website_verified              boolean NOT NULL DEFAULT false,
  website_verification_method   text,
  website_verified_at           timestamp,
  custom_platform_fee_percentage numeric(5,2),
  tracking_api_key              text,
  tracking_api_key_created_at   timestamp,
  last_rejected_at              timestamp,
  rejection_count               integer DEFAULT 0,
  status                        text NOT NULL DEFAULT 'pending',
  approved_at                   timestamp,
  rejection_reason              text,
  created_at                    timestamp DEFAULT now(),
  updated_at                    timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user ON vendor_profiles(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     text REFERENCES "User"(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  changes     jsonb,
  reason      text,
  ip_address  text,
  user_agent  text,
  timestamp   timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id   text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type      text NOT NULL,
  title     text NOT NULL,
  message   text NOT NULL,
  link_url  text,
  metadata  jsonb,
  is_read   boolean NOT NULL DEFAULT false,
  read_at   timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id           text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  merchant_id          text REFERENCES vendor_profiles(id) ON DELETE SET NULL,
  review_text          text,
  overall_rating       integer NOT NULL,
  payment_speed_rating integer,
  communication_rating integer,
  support_rating       integer,
  merchant_response    text,
  merchant_responded_at timestamp,
  admin_response       text,
  responded_at         timestamp,
  responded_by         text REFERENCES "User"(id) ON DELETE SET NULL,
  is_edited            boolean DEFAULT false,
  admin_note           text,
  is_approved          boolean DEFAULT false,
  approved_by          text REFERENCES "User"(id) ON DELETE SET NULL,
  approved_at          timestamp,
  is_hidden            boolean DEFAULT false,
  created_at           timestamp DEFAULT now(),
  updated_at           timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_creator  ON reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant ON reviews(merchant_id);

CREATE TABLE IF NOT EXISTS conversations (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id           text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  merchant_id          text NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  last_message_at      timestamp,
  creator_unread_count integer NOT NULL DEFAULT 0,
  merchant_unread_count integer NOT NULL DEFAULT 0,
  resolved             boolean NOT NULL DEFAULT false,
  resolved_at          timestamp,
  resolved_by          text REFERENCES "User"(id) ON DELETE SET NULL,
  created_at           timestamp DEFAULT now(),
  updated_at           timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_creator  ON conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_merchant ON conversations(merchant_id);

CREATE TABLE IF NOT EXISTS messages (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content         text NOT NULL,
  attachments     jsonb,
  is_read         boolean NOT NULL DEFAULT false,
  deleted_for     jsonb,
  sender_type     text NOT NULL,
  created_at      timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- ========================= STEP 2: creator_profiles =========================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id              text NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  bio                  text,
  youtube_url          text,
  tiktok_url           text,
  instagram_url        text,
  youtube_followers    integer,
  tiktok_followers     integer,
  instagram_followers  integer,
  niches               text[] DEFAULT '{}',
  affiliate_tier       text NOT NULL DEFAULT 'pending',
  city                 text,
  phone                text,
  created_at           timestamp DEFAULT now(),
  updated_at           timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id);
INSERT INTO creator_profiles (user_id, affiliate_tier)
SELECT id, 'verified'
FROM "User"
WHERE role::text = 'AFFILIATE'
  AND NOT EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.user_id = "User".id);

-- ========================= STEP 3: core-table columns =========================
ALTER TABLE "DiscountCode" ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
UPDATE "DiscountCode" SET status = CASE WHEN active THEN 'active' ELSE 'paused' END WHERE status = 'active';
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS method        text;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS reference     text;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paidByUserId" text REFERENCES "User"(id) ON DELETE SET NULL;
UPDATE "Payout" SET method = 'legacy' WHERE method IS NULL;

-- ========================= STEP 5: restore enums (super admin + types) =========================
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'admin@super.com';
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
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TABLE "Payout" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Payout" ALTER COLUMN status TYPE "PayoutStatus" USING (upper(status::text))::"PayoutStatus";
ALTER TABLE "Payout" ALTER COLUMN status SET DEFAULT 'PENDING';

-- ========================= STEP 6: id + updatedAt defaults =========================
ALTER TABLE "User"             ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "DiscountCode"     ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Order"            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "OrderCommission"  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "CommissionSplit"  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Payout"           ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "User"             ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "DiscountCode"     ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "CommissionSplit"  ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "Payout"           ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ========================= STEP 7: creator_payout_methods =========================
CREATE TABLE IF NOT EXISTS creator_payout_methods (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id  text NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  method      varchar(20) NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_payout_methods_creator ON creator_payout_methods(creator_id);
