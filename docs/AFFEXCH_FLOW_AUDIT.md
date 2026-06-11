# AFFEXCH Flow Audit

> Reviewing the AFFEXCH integration against the existing AffiliateXchange app to surface model conflicts, dead-end flows, and inconsistencies before polish. Use this as a decision doc with your team.

---

## 1. Current flow map

```
                       LANDING /
                          |
          +---------------+---------------+
          |                               |
   NEW VISITOR                     EXISTING USER
   APPLY_NOW                       LOGIN (topbar)
          |                               |
   CityModal (step 1)              /login (email-only)
          |                               |
   FormModal (step 2)              by role:
   8 fields, accept terms          ├─ creator → /  (CreatorDashboard, old SaaS)
          |                        ├─ company → /company/dashboard
   SUBMIT → localStorage           └─ admin   → /admin
          |
   Success view shows
   PEP-XXXX-XXXX code
          |
   GO TO MY DASHBOARD
          |
   /affiliate-dashboard ← PUBLIC route
                          localStorage-only data
                          no auth tie-in, no DB row
```

**Routes/touch-points:**
- Public: `/`, `/login`, `/register`, `/affiliate-dashboard`, `/about`, `/terms`, `/privacy`, `/cookie-policy`, `/select-role`, `/forgot-password`, `/reset-password`, `/oauth-callback`
- Authenticated: `/`, `/browse`, `/applications`, `/analytics`, `/messages`, `/favorites`, `/creator-*`, `/company/*`, `/admin/*`

**Persistence:**
- `localStorage.affexch.applications` — AFFEXCH application submissions
- `localStorage.affexch.submittedLinks` — affiliate content links
- `localStorage.affexch.selectedCityId` — current city for the offers section
- Database (Drizzle/Neon) — the existing SaaS user/company/offer/payment data
- Community chat messages — React state, refresh wipes

---

## 2. Inconsistencies — by severity

### 🔴 Critical — broken or dead-end

- [ ] **C1. `CHANGE_CITY` reopens the application form.**
  - File: `client/src/landing-affexch/city/CityContext.jsx`
  - `selectCity()` always calls `setTimeout(() => setApplicationOpen(true), 360)`. The PeptideOffers "CHANGE_CITY" button is supposed to just re-filter offers, but it triggers a duplicate application form.
  - **Fix:** split into `selectCityForApplication(id)` (apply flow, opens form) and `setCity(id)` (filter-only). Wire PeptideOffers' CHANGE_CITY button to the second.

- [ ] **C2. Submitted links never get approved.**
  - File: `client/src/pages/affiliate-dashboard.tsx`
  - Tier system promises `1 approved → VERIFIED, 5 → SILVER, 10 → GOLD, 20 → ELITE` but new links default to `PENDING` and stay there forever. No approval mechanism client- or server-side.
  - **Fix:** add `POST /api/affiliate/links` + a basic admin queue (`/admin/link-queue`) so approvals can flip status → bumps tier.

- [ ] **C3. Sales tracker is permanently empty.**
  - File: `client/src/pages/affiliate-dashboard.tsx`, Section 02
  - Shows "no sales yet — share your code at checkout". No webhook, no API, no integration would ever populate it.
  - **Fix (smallest):** add "// COMING SOON" badge in the section head until a Stripe webhook is wired.
  - **Fix (proper):** wire `POST /api/affiliate/sales` from a vendor webhook that the affiliate's promo code matches.

- [ ] **C4. `/affiliate-dashboard` is publicly reachable + localStorage-only.**
  - Files: `client/src/App.tsx:504` (`publicRoutes` array), `client/src/pages/affiliate-dashboard.tsx`
  - Anyone with the URL sees their browser's localStorage data. No identity. No persistence across devices. Logout has no meaning.
  - **Fix:** after C5 (account creation), move to `ProtectedRouter`, redirect unauthenticated → `/login`. localStorage becomes optional offline cache.

### 🟠 Important — confusing model

- [ ] **I1. Two parallel onboarding paths with no model.**
  - Path A: `APPLY_NOW → city → form → promo code` (no account)
  - Path B: `/register → username + email + password → role onboarding` (creates DB user)
  - Files: `client/src/landing-affexch/sections/Hero.jsx`, `client/src/pages/register.tsx`
  - A new user can't tell which one they're "supposed to" use. The landing topbar has LOGIN but no obvious JOIN/REGISTER link.
  - **Fix:** unify. AFFEXCH apply *creates* the account on submit (auto-derive username from email prefix, set `mustChangePassword = true`, send setup email). Drop the separate `/register` flow or treat it as advanced.

- [ ] **I2. Two creator dashboards co-exist.**
  - `/` → existing `CreatorDashboard` (offers, applications, retainers, messages — full SaaS)
  - `/affiliate-dashboard` → new AFFEXCH dashboard (promo code, sales, tiers, links)
  - Same audience, different feature sets, zero nav between them.
  - **Decision needed:** which is canonical for creators after login? See "Proposed fit flow" below.

- [ ] **I3. Auth field metaphor split.**
  - Register asks for username + email
  - Login takes only email
  - AFFEXCH apply collects email (no username)
  - Files: `client/src/pages/register.tsx`, `shared/validation.ts`, `server/localAuth.ts`
  - Decision earlier (this session): keep username in register. Then unification (I1) needs auto-derivation: `username = email.split("@")[0] + suffix-if-collision`.

- [ ] **I4. AFFEXCH application creates no account.**
  - File: `client/src/landing-affexch/city/ApplicationFormModal.jsx:onSubmit`
  - Stores to localStorage, generates code client-side, no DB row. Close tab → code gone. Different device → no code at all.
  - **Fix:** wire `onSubmit` to `POST /api/applications`. Server creates user + generates code + sets session cookie + returns `{ promoCode, user }`. Replace `generateCode()` client call with server response.

### 🟡 Polish — small smells

- [ ] **P1. Boot screen plays every visit.** Set `sessionStorage.affexch.bootShown` after first show, skip on subsequent.
- [ ] **P2. Cursor trail only on AFFEXCH pages.** `/` and `/affiliate-dashboard` have it; `CreatorDashboard`, `CompanyDashboard`, `AdminDashboard` don't. Either mount `<Cursor />` once globally in `App.tsx`, or accept the split as "matrix surfaces vs SaaS surfaces".
- [ ] **P3. Community chat is fake.** Messages in React state only; refresh wipes; anonymous handle regenerates each session. Rename to "AFFILIATE FEED" (read-only testimonials) or wire to backend.
- [ ] **P4. No JOIN button on landing topbar.** Returning users who already saw APPLY_NOW can only see LOGIN. Add a small `JOIN` link next to LOGIN that opens the city modal.
- [ ] **P5. Brand chrome split between landing & authenticated areas.** AFFEXCH landing/dashboard are matrix-styled; existing SaaS dashboards use shadcn with the matrix `.dark` shim. Same brand, two visual identities.

---

## 3. Proposed "fit" flow

```
                          LANDING /
                              |
              +---------------+--------------+
              |                              |
       NEW AFFILIATE                  EXISTING USER
       APPLY_NOW                      LOGIN
              |                              |
       CityModal (step 1)              /login (email + pw)
              |                              |
       FormModal (step 2)              by role:
       — 8 fields                      ├─ creator → /affiliate-dashboard ★
              |                        ├─ company → /company/dashboard
       SUBMIT → POST /api/applications └─ admin   → /admin
              |
       Server:
         • create users row (role=creator,
           username=auto-derived, mustChangePassword=true)
         • generate promoCode (server-side, unique)
         • store application + promoCode on user
         • email setup link to user
         • set session cookie
              |
       SuccessView shows code +
       "check your email to set a password"
              |
       GO TO MY DASHBOARD → /affiliate-dashboard ★
              |
       Same destination as creator login.
       Single canonical experience.
```

### Properties of the fit flow

| What | Why |
|---|---|
| One onboarding path (APPLY_NOW only) | Removes the "which do I click?" confusion. Existing creators can still log in via LOGIN. |
| Account created on submit | Promo code becomes durable, cross-device. localStorage becomes optional cache. |
| `/affiliate-dashboard` becomes the canonical creator destination | Eliminates the two-dashboard fork. Legacy `CreatorDashboard` parked at `/creator/legacy` for power users / admins. |
| Sales + link queue wired to backend | Removes dead-end flows. Tier system becomes real. |
| Community feed read-only with seed posts, OR persisted | Removes "fake live chat" framing. |
| `CHANGE_CITY` decoupled from apply | Existing affiliates can re-filter without ghost forms popping. |

---

## 4. Decision matrix

| # | Inconsistency | Cost | Backend? | Priority | Decided? |
|---|---|---|---|---|---|
| C1 | CHANGE_CITY duplicate form | Small (5 lines) | No | High | ☐ |
| C2 | Link approval | Medium | Yes (POST, admin queue) | High | ☐ |
| C3 | Sales tracker empty | Small (mark coming soon) OR Large (webhook) | Optional | Medium | ☐ |
| C4 | Dashboard public + localStorage | Big — depends on I4 | Yes | High (after I4) | ☐ |
| I1 | Two onboarding paths | Big | Yes | High (drives I4) | ☐ |
| I2 | Two creator dashboards | Big — UX decision | No (route change) | High | ☐ |
| I3 | Auth field metaphor | Small (auto-derive) | Schema-aware | Low | ☐ |
| I4 | Apply doesn't create account | Medium (new endpoint) | Yes | High | ☐ |
| P1 | Boot every visit | Small | No | Low | ☐ |
| P2 | Cursor only on AFFEXCH pages | Small | No | Low | ☐ |
| P3 | Fake community chat | Small (rename) OR Medium (persist) | Optional | Low | ☐ |
| P4 | No JOIN on topbar | Trivial | No | Low | ☐ |
| P5 | Brand chrome split | Medium (visual refresh) | No | Low | ☐ |

---

## 5. Suggested execution order (when you decide to start)

1. **Quick wins (no backend):** C1 (split selectCity), P1 (boot sessionStorage), P4 (JOIN link), C3-small (mark sales "coming soon"), P3-small (rename community to "Affiliate Feed")
2. **Foundation (backend):** I4 (POST /api/applications creates user + code) → enables C4 (move /affiliate-dashboard to ProtectedRouter) → enables I1 (drop /register from primary surface)
3. **Substance (backend):** C2 (link queue) → tier system becomes real
4. **Decisions:** I2 (canonical creator dashboard) — needs alignment with the existing SaaS roadmap
5. **Polish:** P2 (global cursor), P5 (brand chrome unification), C3-proper (Stripe webhook for sales)

---

## 6. Notes for your team

- The AFFEXCH peptide affiliate flow (promo code → submitted links → tier) is conceptually different from the existing SaaS (apply-to-offers → commission → retainers). Decide whether AFFEXCH is *replacing* the creator path or *coexisting* as a parallel product line. The "two dashboards" question (I2) is downstream of this.
- If they're separate products, consider distinct domains or `/peptides/...` vs `/brands/...` sub-paths to clarify mental model.
- The promo code uniqueness check should move to the server (I4) — current client `generateCode()` has no collision detection. With 32^8 ≈ 1.1T combinations the collision rate is tiny, but a 1-line DB constraint is the right answer.
- All four ☐ "Decided?" boxes in the matrix should be checked by a stakeholder before implementation starts.

---

*Generated by Claude during the AFFEXCH integration review. No code was changed by writing this doc.*
