-- ============================================================
-- 01_prepare_old_db.sql
-- Prepares the OLD peps_affiliate database to also back the new app.
-- ADDITIVE ONLY + idempotent: the old system keeps working untouched.
--   * adds the columns the app needs to "User"
--   * backfills a username for existing users
--   * creates the app-only tables (sessions, vendor_profiles, audit_logs,
--     notifications, reviews, conversations, messages)
-- All new ids are text and all FKs reference "User"(id)/vendor_profiles(id),
-- matching the old DB's text-id convention.
-- ============================================================

-- ---------- User: app columns (old system ignores these) ----------
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

-- Backfill a unique username for existing users (email local-part, de-duplicated).
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

-- ---------- sessions (connect-pg-simple) ----------
CREATE TABLE IF NOT EXISTS sessions (
  sid    varchar PRIMARY KEY,
  sess   jsonb     NOT NULL,
  expire timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- ---------- vendor_profiles (merchants) ----------
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

-- ---------- audit_logs ----------
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

-- ---------- notifications ----------
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

-- ---------- reviews (redesigned: creator <-> merchant, no offers/applications) ----------
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

-- ---------- conversations + messages (redesigned: creator <-> merchant) ----------
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
