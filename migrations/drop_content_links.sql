-- Remove the deprecated content-link / link-approval feature.
-- Affiliate tier is sales-based now, so submitted links are no longer used.
-- Idempotent — safe to run more than once.

DROP TABLE IF EXISTS content_links;

-- These enums were only used by content_links.
DROP TYPE IF EXISTS content_link_status;
DROP TYPE IF EXISTS social_platform;
