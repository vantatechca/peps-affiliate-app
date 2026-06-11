# AFFEXCH vs. Original Spec — Reconciliation Analysis

> Comparing the AFFEXCH changes against the original *Affiliate Marketplace App - Complete Developer Specification*. Identifies what fits, what conflicts, and proposes three resolution paths.

---

## 1. The spec, in one paragraph

The original spec describes a **B2B2C affiliate marketplace** with three roles (Creator, Company, Super Admin). Companies create offers (each with 6–12 mandatory example videos, a commission structure, and creator requirements) → manually approved by admin → creators browse the marketplace, filter by niche/commission, and **apply per offer** → applications auto-approve after **7 minutes** → creator receives a **unique UTM-tagged short link** (`track.yourapp.com/go/{8-char-code}`) → the platform tracks clicks/conversions centrally via GA4 Measurement Protocol → company confirms work → platform charges company, retains 7% (3% processing + 4% platform), pays creator via e-transfer / wire / PayPal / crypto. In-app messaging is **creator ↔ company only**. Creators review companies after campaigns. Admin manages company approvals, offer approvals, reviews, and platform configuration. **MVP launches with one niche (Apps).**

---

## 2. AFFEXCH, in one paragraph

The AFFEXCH integration is a **peptide-vertical affiliate funnel** with one role (the affiliate, essentially a creator). Landing page sells the opportunity → user clicks **APPLY_NOW** → picks a city from a modal → fills an 8-field application form → submits → immediately receives a **promo code** in the format `PEP-XXXX-XXXX`. The promo code is the unit of attribution: **customers enter the code at checkout on peptide-vendor websites** (not on AFFEXCH), and the vendor reports the redemption. Each affiliate sees 4 city-localized offers in the PeptideOffers section (auto-generated business names like "Yorkville Peptide Lab"). The dashboard has 6 sections (promo code / sales tracker / 5-tier system / submitted links / submit a link / guides) plus a floating community chat popup. There is **no company-side flow, no admin-side flow, no account creation, no payment processing, no real tracking — all state lives in localStorage**.

---

## 3. Feature-by-feature map

Legend: ✅ fits the spec • ⚠️ conflicts • ➕ adds something not in spec • ❌ missing from AFFEXCH but required by spec

| Area | Spec | AFFEXCH | Verdict |
|---|---|---|---|
| **Roles** | Creator, Company, Super Admin (3) | Affiliate only (1) | ⚠️ AFFEXCH drops Company and Admin from the new flow |
| **Onboarding** | Email register → role select → role-specific onboarding | APPLY_NOW → city → form → promo code (no account created) | ⚠️ Apply doesn't create a user row |
| **Offer model** | Companies create offers (manual admin approval) with 6–12 mandatory example videos | Algorithmically generated 4 offers per city from a fabricated business-name template | ⚠️ No company-created offers, no videos |
| **Niche system** | 50+ niches, "Apps" as #1 in MVP, admin-curated | Single niche = peptides | ⚠️ Hard-codes one vertical |
| **Application** | Apply per offer, 7-min auto-approval, unique tracking link returned | Apply once, immediate promo code returned, code is global across all peptide vendors | ⚠️ Fundamentally different attribution model |
| **Attribution** | **UTM-tagged short link** clicked by customer | **Promo code** typed by customer at checkout | 🔴 CORE CONFLICT — see §4 |
| **Commission** | Per-sale, per-lead, per-click, retainer, or hybrid — set per offer | Flat 20% on every card | ⚠️ Hard-codes one structure |
| **Tracking infrastructure** | Centralized link tracking, GA4 Measurement Protocol, click events table, conversion postback URL | localStorage only, no backend tracking | ❌ Required by spec |
| **Tier / gamification** | Not in spec | 5-tier system (PENDING/VERIFIED/SILVER/GOLD/ELITE) based on approved content links | ➕ AFFEXCH-specific addition |
| **Content links** | Not in spec | Affiliates submit YouTube/TikTok/Instagram links from the dashboard | ➕ AFFEXCH-specific addition |
| **Dashboard structure** | Spec: creator dashboard has earnings, applications list, analytics per offer | AFFEXCH: promo code, sales tracker, tier, links, guides, community | ⚠️ Reorganized around code+tier, not application+link |
| **Messaging** | Creator ↔ Company 1:1, application-scoped, real-time, attachments | Community chat broadcast (popup), local-state-only, fake | ⚠️ Different surface entirely |
| **Reviews** | 5-star + categories (payment speed, communication, etc.), creator reviews company post-campaign | Not implemented | ❌ Missing |
| **Auto-approval timer** | 7 minutes | Immediate (synchronous) | ⚠️ |
| **Example videos** | 6–12 mandatory per offer, validation enforced | None | ❌ |
| **Search & filter** | Niche, commission range/type, payout, rating, trending | City picker only | ⚠️ |
| **Favorites** | Heart icon, dedicated "Saved" tab, multi-sort | Not implemented | ❌ |
| **Trending / Recommended** | Home screen sections: trending, highest commission, new, recommended | PeptideOffers shows 4-or-6 cards from a static catalog | ❌ |
| **Payments** | Stripe Connect, multi-method (e-transfer/wire/PayPal/crypto), 7% platform fee, auto-charge company | Not implemented; marketing copy says "weekly USD payouts" | ❌ Required by spec |
| **Admin** | Company approvals, offer approvals, review moderation, fee config, niche management, payment processing | Not touched; existing admin pages inherit matrix theme but unchanged in behavior | ➕ Existing admin survives, but doesn't cover AFFEXCH-specific operations (no peptide-vendor approval, no promo-code uniqueness check, no link-approval queue) |
| **Database schema** | 12 tables specified (Users, Creators, Companies, Offers, ExampleVideos, Applications, TrackingLinks, ClickEvents, Messages, Reviews, Transactions, Favorites) | No schema changes; everything in localStorage | ❌ |
| **API endpoints** | ~40 documented (auth, creators, companies, offers, applications, tracking, messages, reviews, admin, payments) | Zero new endpoints; existing endpoints unchanged | ❌ |
| **Notifications** | Push, in-app center, email; types for application status, messages, payments, etc. | Not implemented in AFFEXCH flow | ❌ |
| **Email login** | Spec says JWT + OAuth; AFFEXCH changes login from username to email | Compatible — spec doesn't lock the field choice | ✅ |
| **Landing/marketing visuals** | Spec doesn't prescribe landing design | AFFEXCH landing (matrix dark + 3D R3F sections) | ✅ Fits — landing is a marketing surface |
| **AFFEXCH brand chip beside logo** | N/A — spec doesn't specify branding | Applied app-wide | ✅ Fits — purely visual |

---

## 4. The core conflict (must be resolved)

### Tracking link vs. promo code

The spec's **entire attribution model** assumes the customer clicks a unique link, and the platform logs the click server-side. Every analytics event, every commission calculation, every Phase-1 MVP requirement, every database table (`TrackingLinks`, `ClickEvents`) is built around this.

AFFEXCH's attribution is fundamentally different: **the customer never visits the platform.** They go directly to the peptide vendor's site, type the promo code, and the vendor reports it back. This implies:

- A **webhook** endpoint the vendors call (`POST /api/affiliate/redemptions`)
- A vendor onboarding flow (peptide vendors must register and integrate the webhook)
- Vendor-side fraud detection (anyone can type any code)
- A different DB schema: `PromoCodes` (unique, per-affiliate), `Redemptions` (vendor-reported)

These are two completely separate stacks. **You can run both, but you can't pretend they're the same.**

---

## 5. Where AFFEXCH fits cleanly inside the spec

The peptide flow is **not necessarily a competing model** — it could be expressed as a **specialized niche** within the spec's existing marketplace:

- Add a niche category: **"Peptides & Wellness"**
- Allow that niche to use a **promo-code attribution type** alongside the existing per-sale / per-lead / per-click / retainer / hybrid
- Each peptide vendor registers as a **Company** per spec, with the same manual approval
- Each vendor's offer has its promo code (unique per creator-offer pair via the auto-generated tracking-link mechanism, just rendered as a code instead of a URL)
- Creators apply to peptide offers like any other niche; 7-minute auto-approval returns a code instead of a link
- The 5-tier "PENDING/VERIFIED/SILVER/GOLD/ELITE" system becomes a **niche-specific creator-tier feature** layered on the spec's Creator model (it doesn't replace anything; just adds tier progression as content links accrue)
- The "submit content link" surface becomes a **creator-submitted proof-of-promotion** feature, also useful for non-peptide offers

The city-picker and "4 closest businesses" UX become **marketing-funnel optimizations** for the peptide niche only.

This is the "B" path in §6. It's the most honest reading of how AFFEXCH could fit into the spec without throwing the spec away.

---

## 6. Three reconciliation paths (pick one)

### Path A — Replace the spec with AFFEXCH

> "We're pivoting. The peptide affiliate program is the product. The brand-affiliate marketplace was an earlier idea we're moving on from."

**What you keep:**
- AFFEXCH landing, application flow, dashboard, promo code system, tier progression, community chat
- Single role: affiliate
- Single niche: peptides
- Code-based attribution via vendor webhook

**What you remove from the spec:**
- Multi-niche browsing, filtering, search
- 6–12 example videos per offer (whole concept)
- Application-per-offer (becomes one-time apply)
- In-app messaging creator ↔ company
- Reviews
- Per-sale/lead/click/retainer commission types
- Tracking-link click events table
- Company role + admin company-approval flow
- Most of the existing 60+ pages (browse, offers, applications, messages, retainers, etc.)

**Migration effort:** Largest. Existing SaaS code becomes legacy / deleted. Major DB schema change. Re-architecting admin.

**Spec changes needed:** Total rewrite. Sections 2 (roles), 4 (features), 5 (schema), 6 (endpoints), 9 (workflows), 10 (analytics), 13 (launch strategy) all become specific to peptides.

### Path B — Peptides becomes a niche inside the spec (recommended)

> "AFFEXCH is the peptide vertical of the broader marketplace. The spec's framework still holds; peptides is the first niche we're activating."

**What you keep from spec:**
- 3 roles, full marketplace, multi-niche, manual company approvals
- Per-offer applications + 7-min auto-approval
- In-app messaging creator ↔ company (peptide vendors *are* companies)
- Reviews, tracking, analytics infrastructure
- All 12 DB tables, all ~40 API endpoints

**What AFFEXCH contributes:**
- A new commission type: `promo_code` (alongside per_sale/lead/click/retainer/hybrid)
- A new attribution path: vendor-reported redemption webhook
- "Peptides & Wellness" niche, populated with real vendors who registered as Companies
- The 5-tier creator system (cross-niche feature, not peptide-specific)
- The "submit content links" / proof-of-promotion surface (cross-niche)
- The landing page redesign (marketing surface for the peptide niche or the platform as a whole)
- The matrix visual language (UI choice — extend to all surfaces or keep peptide-only)

**Things to remove from the AFFEXCH integration:**
- The standalone affiliate-dashboard at `/affiliate-dashboard` — replace with the spec's creator dashboard that has a peptide-niche-specific view when the active offer is in that niche
- City picker as primary funnel — make it a filter inside the existing niche browse
- localStorage-only application persistence — wire to `POST /api/applications` per spec
- Fake community chat — either drop it or replace with the spec's reviews + creator-company messaging

**Migration effort:** Medium. Reuses existing code. Adds: niche, commission type, redemption webhook, tier feature, link-submission feature. Touches admin (peptide-vendor approval queue inherits spec's company-approval flow).

**Spec changes needed:** Small additions, not rewrites:
- Section 4.2.C — add `promo_code` to commission type enum and document the vendor webhook
- Section 5 — add `PromoCodes`, `Redemptions`, `CreatorTiers`, `ContentLinks` tables
- Section 6 — add `POST /api/affiliate/redemptions` (webhook), `POST /api/creators/me/content-links`, admin link-approval endpoints
- Section 9 — add tier-progression workflow
- Section 13 — keep launch phasing; peptides slots into Phase 1 alongside or instead of Apps

### Path C — Two separate products (sub-paths)

> "The marketplace and the peptide flow are different products with overlapping infrastructure. Run them in parallel."

**Architecture:**
- `/` → spec's marketplace landing (creators browse offers)
- `/peptides/` → AFFEXCH landing (apply for a code, vertical-specific)
- Shared auth, payments, admin chrome — but separate dashboards, separate models, separate analytics

**What you keep:**
- Everything from spec
- Everything from AFFEXCH

**What changes:**
- Move AFFEXCH landing to `/peptides/`
- AFFEXCH applicants get a `users` row with role `peptide_affiliate` (distinct from `creator`)
- Two creator-side dashboards co-exist intentionally, segmented by role
- Admin gains a "Peptide Program" panel alongside the marketplace admin

**Migration effort:** Smallest. Almost nothing has to be removed.

**Spec changes needed:** Section 2 — add a 4th role (peptide_affiliate). Section 13 — split launch into Marketplace + Peptide Program.

**Risk:** Code/feature duplication. Drift over time. Two products to maintain.

---

## 7. Specific item-level resolutions

For every AFFEXCH change I made in this session, what should happen under each path:

| AFFEXCH change | Path A — Replace | Path B — Niche | Path C — Parallel |
|---|---|---|---|
| AFFEXCH landing at `/` | Keep as-is | Make it a sub-page `/peptides`, restore generic marketing landing at `/` | Move to `/peptides`, restore generic at `/` |
| `/affiliate-dashboard` | Promote to canonical creator dashboard | Delete — fold features into spec's creator dashboard | Keep, retitle as "Peptide Program dashboard" |
| Apply flow (city → form → code) | Keep, drop spec's per-offer apply | Add as an opening funnel; underneath, creator still applies per offer (auto-approved) | Keep, only on `/peptides` |
| 5-tier system | Keep as core | Make it cross-niche on Creator model | Keep, peptide-only |
| Submitted links | Keep, wire to backend approval queue | Same — but available cross-niche, not just peptide | Keep, peptide-only |
| Community chat popup | Keep, persist to backend | Replace with spec's 1:1 creator-company messaging + reviews | Keep, peptide-only |
| Email-based login | Compatible with spec — keep | Compatible — keep | Compatible — keep |
| AFFEXCH brand chip beside logo | Keep | Keep (it's a brand chip, not a tagline) | Keep |
| Matrix dark theme | Apply everywhere | Decide: peptides only or app-wide | Peptides only |
| ProductCard "Yorkville Peptide Lab" etc. | These ARE the offers — promote to real DB rows | Each peptide vendor registers as a Company; their offer is a real row; mock data goes away | Same as B for the peptide product |
| Promo code `PEP-XXXX-XXXX` | Server-side generated, unique per affiliate | Server-side generated, unique per *application* (per spec), code-based commission type | Same as A within the peptide product |
| Sales tracker section | Wire to vendor webhook | Same | Same |
| Guides section | Keep | Move to a generic "help center" cross-niche | Keep on peptide product |
| Boot screen / Cursor / 3D core | Decorative — keep | Decorative — keep | Decorative — keep on `/peptides` only |

---

## 8. What I recommend you put in front of stakeholders

The fundamental decision is **§6, A vs B vs C**. Until that's locked, the code-level cleanup we discussed in `AFFEXCH_FLOW_AUDIT.md` is premature — we'd be polishing flows that might get removed (Path A) or merged into existing ones (Path B).

A team meeting agenda:

1. **Strategy:** is AFFEXCH a pivot (A), a niche launch within the spec (B), or a parallel product (C)?
2. **Brand:** does "AFFEXCH" replace "AffiliateXchange" as the product name, or is AFFEXCH a sub-brand for the peptide vertical?
3. **Audience:** the spec targets brand affiliates broadly (apps, SaaS, etc.); AFFEXCH targets peptide promoters specifically. Is the audience changing, expanding, or do we serve both?
4. **Attribution:** can the spec accommodate **two** attribution mechanisms (link + code) or do we pick one?
5. **Compliance:** peptides have specific regulatory considerations (FDA, health claims, age-gating, marketing rules per platform) not addressed in the spec. Path A makes this our primary concern; Path B/C keep it scoped to one niche.

---

## 9. My honest take

The AFFEXCH integration as it stands today **does not fit cleanly into the existing spec** — it conflicts on the core attribution model, drops two of three roles, eliminates the manual-vetting / quality-control layer the spec spent considerable space defining, and replaces per-offer applications with a one-time code. It looks like a different product that happens to share a name and a code repo.

**My recommendation is Path B** ("peptides as a niche inside the spec") because:

1. The spec is detailed, well-thought-out, and you've shipped considerable infrastructure for it (60+ pages, Stripe Connect, real DB, OAuth, 2FA, content moderation). Throwing that away (Path A) is expensive.
2. The peptide vertical is a real opportunity but doesn't need its own everything — it needs a niche slot and a small attribution extension to the existing model.
3. Path C duplicates infrastructure and creates two products to maintain forever.
4. Path B lets the AFFEXCH **branding, landing page, and tier/link features become cross-niche enhancements** to the existing platform, while peptide-specific things (promo codes, vendor webhook) become a *new commission type* layered on the existing system.

But this is a strategic decision, not an engineering one. The right answer depends on what your boss thinks AFFEXCH is as a business.

---

*Generated by Claude during reconciliation review of the AFFEXCH integration against `Affiliate Marketplace App - Complete Developer Specification.docx`. No code was changed by writing this doc.*
