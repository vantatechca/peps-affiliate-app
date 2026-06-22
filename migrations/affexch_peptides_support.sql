-- AFFEXCH: peptide offers catalogue + per-affiliate support chat.
-- Also drops the old anonymous community chat (replaced by support chat).
-- Idempotent — safe to run more than once.

-- Rename the base affiliate tier 'pending' -> 'starter' (sales-based ladder).
-- ALTER TYPE ... RENAME VALUE relabels the value in place, so existing rows
-- follow automatically. Reset the column default to the new label afterward.
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
ALTER TABLE creator_profiles ALTER COLUMN affiliate_tier SET DEFAULT 'starter';

-- Support thread status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_thread_status') THEN
    CREATE TYPE support_thread_status AS ENUM ('open', 'closed');
  END IF;
END$$;

-- Top peptide offers to promote (admin-curated, shuffled daily on the dashboard)
CREATE TABLE IF NOT EXISTS peptides (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name varchar(120) NOT NULL,
  merchant_url varchar(500) NOT NULL,
  discount_percent integer NOT NULL DEFAULT 10,
  commission_percent integer NOT NULL DEFAULT 20,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_peptides_active ON peptides(is_active);

-- Support chat — one thread per affiliate
CREATE TABLE IF NOT EXISTS support_threads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
  sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role varchar(16) NOT NULL,
  body varchar(2000) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id);

-- Drop the old anonymous community chat (fresh start per product decision)
DROP TABLE IF EXISTS community_chat_messages;
