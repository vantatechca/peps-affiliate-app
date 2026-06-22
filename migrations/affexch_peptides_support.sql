-- AFFEXCH: peptide offers catalogue + per-affiliate support chat.
-- Also drops the old anonymous community chat (replaced by support chat).
-- Idempotent — safe to run more than once.

-- Affiliate tier is now order-count based: verified 0 (on signup) · starter 1-9
-- · silver 10-29 · gold 30-59 · elite 60+. Rename the legacy 'pending' value to
-- 'starter' (now the 1-9 rung) so the label exists, then default new accounts to
-- 'verified'. ALTER TYPE ... RENAME VALUE relabels in place so existing rows follow.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'affiliate_tier' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE affiliate_tier RENAME VALUE 'pending' TO 'starter';
  END IF;
END$$;
ALTER TABLE creator_profiles ALTER COLUMN affiliate_tier SET DEFAULT 'verified';

-- Support thread status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_thread_status') THEN
    CREATE TYPE support_thread_status AS ENUM ('open', 'closed');
  END IF;
END$$;

-- "Hot selling peptides" list (admin-curated, shuffled daily on the dashboard).
-- merchant_url is optional — affiliate cards show the commission only.
CREATE TABLE IF NOT EXISTS peptides (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name varchar(120) NOT NULL,
  merchant_url varchar(500),
  discount_percent integer NOT NULL DEFAULT 10,
  commission_percent integer NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_peptides_active ON peptides(is_active);
-- For DBs created before merchant_url became optional:
ALTER TABLE peptides ALTER COLUMN merchant_url DROP NOT NULL;

-- Seed the initial list (only if the table is empty, so re-runs don't duplicate).
INSERT INTO peptides (product_name, discount_percent, commission_percent, display_order)
SELECT v.product_name, 10, 20, v.ord
FROM (VALUES
  ('Retatrutide', 1),
  ('GLOW Blend - BPC-157 + GHK-Cu + TB-500', 2),
  ('Tesamorelin', 3),
  ('NAD+', 4),
  ('CJC-1295 No DAC + Ipamorelin', 5),
  ('BPC-157 + TB-500', 6),
  ('MOTS-c', 7),
  ('GHK-Cu', 8)
) AS v(product_name, ord)
WHERE NOT EXISTS (SELECT 1 FROM peptides);

-- Support chat — one thread per affiliate
CREATE TABLE IF NOT EXISTS support_threads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id varchar NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  status support_thread_status NOT NULL DEFAULT 'open',
  last_message_at timestamp DEFAULT now(),
  creator_unread_count integer NOT NULL DEFAULT 0,
  admin_unread_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id varchar NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_id varchar NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  sender_role varchar(16) NOT NULL,
  body varchar(2000) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id);

-- Drop the old anonymous community chat (fresh start per product decision)
DROP TABLE IF EXISTS community_chat_messages;
