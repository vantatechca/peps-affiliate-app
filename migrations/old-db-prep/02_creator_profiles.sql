-- ============================================================
-- 02_creator_profiles.sql
-- Adds the creator_profiles table to the OLD database (gap from step 1).
-- The app stores affiliate metadata (tier, socials, city) here, separate
-- from the shared "User" table. Additive + idempotent.
-- ============================================================

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

-- Backfill a creator_profiles row for every existing affiliate (old role = 'AFFILIATE').
INSERT INTO creator_profiles (user_id, affiliate_tier)
SELECT id, 'verified'
FROM "User"
WHERE role = 'AFFILIATE'
  AND NOT EXISTS (SELECT 1 FROM creator_profiles cp WHERE cp.user_id = "User".id);
