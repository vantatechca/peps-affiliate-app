# AFFEXCH Session Handoff

> **Paste this entire file at the start of a new Claude session.** It contains everything needed to continue the peptide pivot without re-explaining context.

---

## 1. What this project is

`d:\Projects\Affiliate\AffiliateXchange` — a React + Vite frontend + Express + Drizzle + Neon Postgres backend that started as a generic creator/company affiliate marketplace (per `Affiliate Marketplace App - Complete Developer Specification.docx`).

**It is being pivoted to a peptide-only affiliate platform called AFFEXCH.** The visual/UI work is done. Phase 1 of the flow refactor is complete. Phases 2–9 remain.

---

## 2. Critical context — read these first

In order of priority:

1. [docs/AFFEXCH_VS_SPEC_RECONCILIATION.md](docs/AFFEXCH_VS_SPEC_RECONCILIATION.md) — full audit of how AFFEXCH conflicts with the original spec. Decision: **Path B** (peptide niche inside existing spec framework). 13 conflicts identified with item-by-item resolutions.
2. [docs/AFFEXCH_FLOW_AUDIT.md](docs/AFFEXCH_FLOW_AUDIT.md) — 13 specific bugs / dead-ends in the AFFEXCH flow with concrete fixes.
3. `Affiliate Marketplace App - Complete Developer Specification.docx` (project root) — the original 1417-line spec. Old vision, not all of it survives.
4. The fit plan (see §5 of this doc).

---

## 3. Locked-in decisions (do not relitigate)

| Question | Answer |
|---|---|
| Replace whole app or fit changes into existing? | **Fit into existing** (Path B). Keep backend infrastructure. |
| Single role or multi-role? | **Two roles only**: `admin` + `affiliate` (stored as `creator` in DB enum for backward compat). |
| Drop `company` role? | Yes. Stop creating new company users. Existing `company@affiliatexchange.ca` user kept dormant for backward compat. Company portal code remains but is unreachable from new signups. |
| Product catalog | **Peptides only** (one niche). Boss owns 500-600 peptide vendor websites internally — they become `Companies` rows in the DB, seeded by boss-provided list. |
| Attribution model | **Promo codes** (`PEP-XXXX-XXXX`) typed at vendor checkout. New `commission_type=promo_code` value added to existing enum. Coexists with the spec's tracking-link model. |
| Payouts | **Stripe Connect + PayPal + USDC optional**. Hide other methods (e-transfer, wire, etc.) from the UI. Default payout: weekly USD. |
| Brand chip | `AFFEXCH` beside the logo, app-wide. Full name "AffiliateXchange" stays in body content. |
| Domain | New domain not yet purchased. Boss will buy when app is ready. Current `affiliatexchange.ca` to be abandoned per boss directive (no redirect, no trace). |
| Database | **Reuse current Neon Postgres** (host: `ep-fragrant-shape-aje6kkb2-pooler.c-3.us-east-2.aws.neon.tech`). Drop tables not needed by AFFEXCH, add new ones. |
| Cloud storage | **Reuse current GCS bucket** `affexch` (project `tool-development-478707`). IAM still needs `roles/storage.objectAdmin` for SA `affexch-storage@…`. See `[scripts/diag-gcs.ts]`. |
| Tier system | 0 links = PENDING, 1 = VERIFIED, 5 = SILVER, 10 = GOLD, 20 = ELITE. Cross-niche creator-level achievement. |
| Community chat | **Dropped** (was floating popup; not in spec model). Files kept in git in case boss/Dana want it back. |
| Sales tracker | Maps to existing `transactions` table (filtered per affiliate). Real after Phase 6 webhook ships. |

---

## 4. Seeded accounts (working credentials)

| Email | Role | Password |
|---|---|---|
| `admin@affiliatexchange.ca` | admin | `Affx-Admin-2026!` |
| `demo@affiliatexchange.ca` | creator/affiliate | `Affx-Demo-2026!` |
| `company@affiliatexchange.ca` | company (dormant) | `Affx-Company-2026!` — **may be repurposed as Dana's admin account** |

Reset script: `scripts/reset-password.ts` (`npx tsx --env-file=.env scripts/reset-password.ts <email> <newPassword>`)
Diagnostic: `scripts/diag-user.ts`, `scripts/diag-gcs.ts`, `scripts/list-users-by-role.ts`

---

## 5. The fit plan — 9 phases

### ✅ Phase 1 — Tear down (DONE)
- Removed `/affiliate-dashboard` route from `App.tsx` + `publicRoutes[]`
- Deleted `client/src/pages/affiliate-dashboard.tsx` + `.css`
- Dropped `<CommunityChatPopup />` from `Landing.jsx` (files kept in git)
- Success modal navigates to `/login` instead of `/affiliate-dashboard` (Phase 3 will switch to auto-login + `/creator/dashboard`)
- Hidden Creator/Company radio buttons in `/register` — defaults to `creator` via hidden input
- Auto-completed `/select-role` page (Google OAuth flow) — no user-visible role choice, auto-assigns `creator`
- Added explanatory comments where company-side code was left dormant

**Files touched in Phase 1:** `client/src/App.tsx`, `client/src/landing-affexch/Landing.jsx`, `client/src/landing-affexch/city/ApplicationFormModal.jsx`, `client/src/components/app-sidebar.tsx`, `client/src/pages/register.tsx`, `client/src/pages/select-role.tsx`. **Two files deleted:** affiliate-dashboard.tsx + .css.

### ⏭️ Phase 2 — DB schema additions (NEXT)
Drizzle migrations in `shared/schema.ts`:
- `creators.affiliate_tier` enum: `pending | verified | silver | gold | elite` (default `pending`)
- `creators.city` text column
- `offers.commission_type` enum: add `promo_code` value
- `offers.requirements` JSON: documented `city` field (no migration needed if requirements is already JSON)
- **NEW table `promo_codes`**: `id, creator_id, application_id, code UNIQUE, status, created_at`
- **NEW table `content_links`**: `id, creator_id, application_id, url, platform, status, approved_by, approved_at, created_at`
- **NEW table `code_redemptions`**: `id, promo_code_id, vendor_id, sale_amount, commission_amount, customer_email_hash, redeemed_at`

Run `npm run db:push` to apply. Effort: 3-4 hours.

### Phase 3 — APPLY_NOW → real registration
Replace `localStorage` write in `ApplicationFormModal.jsx onSubmit()` with `POST /api/auth/register`. Field mapping:
- name → split into firstName/lastName
- email → users.email
- phone → creators.phone (add column)
- city → creators.city (added in Phase 2)
- instagram/tiktok/youtube → creators.social_links JSON
- followers (string range) → creators.follower_counts JSON
- why → creators.bio

Auto-derive username from email prefix. Server generates unique promo code (DB-enforced uniqueness). Set session cookie. Client receives `{ user, promoCode }`, redirects to `/creator/dashboard`. Effort: 4-6 hours.

### Phase 4 — Merge dashboard sections
Add 6 sections to existing `CreatorDashboard`:
- PROMO CODE (from `promo_codes` table)
- SALES TRACKER (from existing `transactions` table)
- MILESTONE PROGRESS (from `creators.affiliate_tier`)
- SUBMITTED LINKS (from `content_links` table)
- SUBMIT A LINK (form → `POST /api/affiliate/links`)
- GUIDES (the 2-card design from old `/affiliate-dashboard`)

The deleted `affiliate-dashboard.tsx` had reference code for these — recover from git: `git show HEAD~N:client/src/pages/affiliate-dashboard.tsx`. Effort: 6-8 hours.

### Phase 5 — Seed peptide catalog
Need from boss: list of 500-600 vendor websites (name, city, peptides, commission %).
Stub until then: 30-50 fake vendors covering top 30 cities. Each becomes a `companies` row + `offers` row with `commission_type=promo_code`. Effort: 4-6 hours.

Replace algorithmic `offersForCity()` in `client/src/landing-affexch/lib/cities.js` with a real query: `GET /api/offers?city=X&limit=4`.

### Phase 6 — Vendor webhook + code validation
New endpoints:
- `POST /api/promo-codes/validate` — vendor site calls when customer enters code at checkout. Returns `{ valid, discountPercent, affiliateId }`.
- `POST /api/promo-codes/redeem` — vendor site calls when sale completes. Creates `code_redemption` row, creates `transaction` row, updates affiliate earnings.

Per-vendor API key auth. Admin generates keys in `/admin/vendors`. Effort: 6-8 hours.

### Phase 7 — Admin content-link queue
New admin page `/admin/content-links`. Lists pending links. Approve/reject. Approval auto-recomputes affiliate tier (counts approved links, bumps tier if threshold crossed). Sends email notification. Effort: 3-4 hours.

### Phase 8 — Payment method onboarding
Narrow existing payment-method selector to Stripe Connect + PayPal + USDC. Hide e-transfer/wire/other crypto from UI. Existing payment infrastructure (Stripe Connect endpoints in `server/`) unchanged. Effort: 3-4 hours.

### Phase 9 — Polish + cleanup
Hide remaining `/company/*` from nav, add weekly payout cron, mobile QA pass. Effort: 2-3 hours.

---

## 6. External blockers (waiting on boss / Dana)

| Blocker | Needed for | Workaround |
|---|---|---|
| 500-600 vendor list (name, city, peptide, commission %) | Phase 5 | Stub catalog of 30-50 fake vendors |
| Vendor sites integration — same e-com platform? | Phase 6 | Build endpoints; document; test with curl until live integration |
| Dana's screenshots/feedback on application form fields | Phase 3 (might tweak fields) | Build with current 8 fields; adjust on her notes |
| Confirm: platform takes a cut of 20% commission, or affiliate gets full 20%? | Phase 6 + 8 | Default: affiliate gets 20%, platform 0 (boss owns both sides) |
| Company role: keep `company@affiliatexchange.ca` or repurpose as Dana? | Anytime | Hold for boss decision |

---

## 7. Environment + infra state

- Dev server: `npm run dev` → http://localhost:3000 (Express + Vite middleware, single port)
- Server PID 15384 was the long-running instance during this session (you may need to kill it: `Stop-Process -Id <pid> -Force`)
- `.env` exists with valid Neon DATABASE_URL, GCS keyfile path, SESSION_SECRET, Stripe keys, Google OAuth keys
- BASE_URL in `.env` is `https://affiliatexchange.ca` (production URL) — set to `http://localhost:3000` for local OAuth callback testing if needed
- GCS keyfile at `config/tool-development-478707-490fc1d70579.json` — exists, auth works, but the SA needs `roles/storage.objectAdmin` granted in GCP console on the `affexch` bucket (run `npx tsx --env-file=.env scripts/diag-gcs.ts` to verify)
- Google OAuth: boss said the OAuth consent screen still shows "AffiliateXChange" — needs updating to "AFFEXCH" in GCP console > APIs & Services > OAuth consent screen > Branding tab. Frontend env / code is fine.

---

## 8. Codebase landmarks

| What | Where |
|---|---|
| Existing route table | `client/src/App.tsx` — `PublicRouter` (lines ~98-115) and `ProtectedRouter` (lines ~498-540) |
| Landing page (AFFEXCH) | `client/src/landing-affexch/Landing.jsx` |
| AFFEXCH sections | `client/src/landing-affexch/sections/` |
| AFFEXCH community popup (dropped, kept in git) | `client/src/landing-affexch/community/` |
| City selection + form modals | `client/src/landing-affexch/city/` |
| Existing creator dashboard | `client/src/pages/creator/dashboard.tsx` |
| Existing admin pages | `client/src/pages/admin-*.tsx` |
| App sidebar (role-based menu) | `client/src/components/app-sidebar.tsx` (lines 269-273 for role branch) |
| Drizzle schema | `shared/schema.ts` |
| Server auth | `server/localAuth.ts` (Passport LocalStrategy with `usernameField: "email"`) |
| Server routes | `server/routes.ts` (very large, 12k+ lines — search by endpoint path) |
| Server entry | `server/index.ts` |

---

## 9. Important constraints / gotchas

1. **Existing typecheck has ~42 pre-existing errors** in `server/routes.ts`, `withdrawalService.ts`, `payment-settings.tsx`, `creator-affiliate-sales.tsx`, etc. These are NOT from this session's work — they pre-date the pivot. Filter typecheck output by file when verifying new work.
2. **`/affiliate-dashboard` route is GONE** — any code that links to it will 404. Phase 4 merges its sections into `/creator/dashboard`.
3. **Two community-chat surfaces existed in git history**: `AffiliateCommunityChat.jsx` (inline section, deleted earlier) and `CommunityChatPopup.jsx` (floating popup, dropped from mount in Phase 1 but file kept). The popup is the version to resurrect if boss wants it back.
4. **The user instruction earlier was "fit changes into old app, not replace"**. Don't suggest replacing the codebase wholesale with boss's `AFFEXCH.zip` (which is in Downloads/) — that question is already decided.
5. **AFFEXCH.zip in `C:/Users/Jheraldine Nagma/Downloads/AFFEXCH/AFFEXCH/`** is boss's standalone version (Express + JSON files + JWT, no Postgres, no GCS). We are NOT migrating to it. The visual style + product orientation we copy; the storage model we don't.
6. **DB migration tool**: `npm run db:push` (Drizzle Kit). Schema lives in `shared/schema.ts`.
7. **No emojis in code or commits** unless the user explicitly asks.
8. **Mobile-first**: every UI change must work at 375px width. Tap targets ≥44px. iOS-safe (16px input font to prevent zoom).

---

## 10. How to start the next session

Open a new Claude session in `d:\Projects\Affiliate\AffiliateXchange`, paste this file, and say something like:

> "Continue Phase 2 of the AFFEXCH peptide pivot — DB schema additions per the handoff doc."

Or for any phase:

> "Continue Phase N per `docs/AFFEXCH_SESSION_HANDOFF.md`."

The new session should:
1. Read `docs/AFFEXCH_SESSION_HANDOFF.md` first (this file)
2. Skim `docs/AFFEXCH_VS_SPEC_RECONCILIATION.md` and `docs/AFFEXCH_FLOW_AUDIT.md` for full context if needed
3. Read `shared/schema.ts` before starting Phase 2 to see current state
4. Use `TodoWrite` to track phase progress
5. Run typecheck filtered to touched files after every meaningful change
6. NOT ask whether to replace vs fit — that's decided
7. NOT regenerate the 9-phase plan — that's documented above

---

*Generated at end of session 2026-06-01 by Claude. Phase 1 complete. Phase 2 next.*
