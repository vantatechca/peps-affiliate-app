# Authentication Quick Reference Guide

## System Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│                      AFFILIATEXCHANGE AUTH SYSTEM                  │
└──────────────────────────────────────────────────────────────┘

FRONTEND LAYER
┌─────────────────────────────────────────────────────────────┐
│  Login Page (login.tsx)     Register Page (register.tsx)    │
│  ├─ Username/Password       ├─ Choose Role (Creator/Co)    │
│  ├─ Form Validation         ├─ Email + Username            │
│  └─ POST /api/auth/login   └─ POST /api/auth/register     │
│                                                              │
│  useAuth Hook (useAuth.ts)                                  │
│  ├─ Queries /api/auth/user                                  │
│  ├─ Provides: user, isLoading, isAuthenticated             │
│  └─ Session cookie auto-managed by browser                  │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
AUTHENTICATION ROUTES (in routes.ts)
┌─────────────────────────────────────────────────────────────┐
│ POST /api/auth/register  → Validates → Hash Password       │
│                          → Create User → Create Profile    │
│                          → Auto-login → Return user data   │
│                                                              │
│ POST /api/auth/login     → Find User → bcrypt Compare      │
│                          → Create Session → Return role    │
│                                                              │
│ POST /api/auth/logout    → Clear Session → Return success  │
│                                                              │
│ GET /api/auth/user       → Check isAuthenticated           │
│ (requireAuth middleware) → Fetch user from DB → Return    │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
PASSPORT.JS LOCAL STRATEGY (localAuth.ts)
┌─────────────────────────────────────────────────────────────┐
│ Strategy: passport-local                                    │
│ ├─ Verify: Find user by username + bcrypt compare          │
│ ├─ Serialize: Save user.id to session                       │
│ └─ Deserialize: Load fresh user from DB on each request    │
│                                                              │
│ Session Storage: PostgreSQL (connect-pg-simple)             │
│ ├─ Table: sessions                                          │
│ ├─ TTL: 7 days                                              │
│ ├─ Cookie: HTTP-only, Secure, 7-day max age               │
│ └─ Secret: Signed with SESSION_SECRET env var              │
└─────────────────────────────────────────────────────────────┘
                          ↓↓↓
DATABASE LAYER
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Tables:                                          │
│ ├─ users                                                    │
│ │  ├─ id (UUID PK)                                          │
│ │  ├─ username (UNIQUE)                                     │
│ │  ├─ email (UNIQUE)                                        │
│ │  ├─ password (bcrypt hashed)                              │
│ │  ├─ firstName, lastName, profileImageUrl                  │
│ │  ├─ role (creator | company | admin)                      │
│ │  └─ accountStatus (active | suspended | banned)           │
│ │                                                            │
│ ├─ sessions                                                 │
│ │  ├─ sid (session ID, PK)                                  │
│ │  ├─ sess (JSONB user data)                                │
│ │  └─ expire (TTL timestamp)                                │
│ │                                                            │
│ ├─ creatorProfiles (linked to users via userId)            │
│ │  ├─ bio, youtube/tiktok/instagram URLs                   │
│ │  ├─ follower counts, niches                               │
│ │  └─ created/updated timestamps                            │
│ │                                                            │
│ └─ companyProfiles (linked to users via userId)            │
│    ├─ legalName, tradeName, website, logo                  │
│    ├─ industry, size, year founded, contact info           │
│    ├─ verification document, status (pending/approved)     │
│    └─ created/updated timestamps                            │
│                                                              │
│ Storage Layer (storage.ts):                                 │
│ ├─ getUser(id) → Fetch from users table                    │
│ ├─ getUserByUsername(username) → Find user by username     │
│ ├─ getUserByEmail(email) → Find user by email              │
│ ├─ createUser(userData) → Insert new user + generate UUID  │
│ ├─ upsertUser(userData) → Insert or update (OAuth use)     │
│ └─ updateUser(id, updates) → Modify existing user          │
└─────────────────────────────────────────────────────────────┘
```

## User Registration Flow

```
User Action                    Backend Processing              Database
┌──────────────┐              ┌──────────────┐               ┌────────┐
│ Fill Form    │ ──POST───→  │ Validate     │               │        │
│              │ register    │ ├─ Username  │               │ users  │
│              │             │ ├─ Email     │               │        │
│              │             │ └─ Password  │               │        │
│              │             │     (6 char) │               │        │
│              │             └──────────────┘               │        │
│              │                    │                       │        │
│              │                    ↓                       │        │
│              │              ┌──────────────┐             │        │
│              │              │ Hash pass    │             │        │
│              │              │ (bcrypt)     │             │        │
│              │              └──────────────┘             │        │
│              │                    │                      │        │
│              │                    ↓                      │        │
│              │              ┌──────────────┐    INSERT   │        │
│              │              │ Create user  │ ─────────→ │   ✓    │
│              │              │ + profile    │            │        │
│              │              └──────────────┘            │        │
│              │                    │                     │        │
│              │                    ↓                     │        │
│ Redirected   │ ←──JSON──────  Create session           └────────┘
│ to dashboard │    + user data     │
│              │              ┌──────────────┐            ┌────────┐
│              │              │ Set secure   │   INSERT   │        │
│              │              │ cookie       │ ─────────→ │        │
│              │              │ in session   │            │ sessio │
│              │              │ table        │            │ ns     │
│              │              └──────────────┘            │        │
└──────────────┘                                          └────────┘
```

## Login Flow

```
User Action                Backend Processing             Database
┌──────────────┐          ┌──────────────┐              ┌────────┐
│ Enter        │ ─POST─→  │ Find user by │  SELECT      │ users  │
│ username +   │  login   │ username     │ ─────────→  │        │
│ password     │          │              │             └────────┘
│              │          └──────────────┘
│              │                 │
│              │                 ↓
│              │          ┌──────────────┐
│              │          │ bcrypt       │
│              │          │ compare      │
│              │          │ password     │
│              │          └──────────────┘
│              │                 │
│              │        ┌────────┴────────┐
│              │        ↓                 ↓
│              │    SUCCESS         FAIL (401)
│              │        │                 │
│              │        ↓                 ↓
│              │  ┌──────────────┐  ┌──────────────┐
│              │  │ Create       │  │ Return error │
│              │  │ session in   │  │              │
│              │  │ PostgreSQL   │  └──────────────┘
│              │  └──────────────┘        │
│              │        │                 │
│              │        ↓                 ↓
│              │  ┌──────────────┐  User stays on
│              │  │ Set secure   │  login page
│              │  │ HTTP-only    │
│              │  │ cookie       │
│              │  └──────────────┘
│              │        │
│ Redirected   │ ←──────┴──────────────────
│ to role      │ Return: { user, role }
│ dashboard    │
└──────────────┘
```

## Authentication Middleware Chain

```
Incoming Request
    │
    ↓
Express JSON Parser
    │
    ↓
Passport Middleware (passport.initialize)
    │
    ↓
Session Middleware (deserialize user from cookie)
    │
    ↓
Request Reaches Route Handler
    │
    ├─→ No Middleware Required (public routes)
    │   Example: POST /api/auth/login
    │
    ├─→ requireAuth Middleware (isAuthenticated)
    │   Check: req.isAuthenticated() == true
    │   If false: Return 401 "Unauthorized"
    │   Example: GET /api/auth/user
    │
    └─→ requireRole('creator' | 'company' | 'admin')
        Check: req.user.role matches one of allowed roles
        If false: Return 403 "Forbidden"
        Example: POST /api/offers (requires 'company' role)
```

## Key Database Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    USERS (Central)                      │
│  ├─ id (PK)                                             │
│  ├─ username, email, password                           │
│  ├─ role (creator | company | admin)                    │
│  ├─ accountStatus                                       │
│  └─ createdAt, updatedAt                                │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ↓             ↓             ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ CREATOR      │  │  COMPANY     │  │  SESSIONS    │
│ PROFILES     │  │  PROFILES    │  │              │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ userId (FK)  │  │ userId (FK)  │  │ sid (PK)     │
│ bio          │  │ legalName    │  │ sess (JSONB) │
│ social URLs  │  │ website      │  │ expire       │
│ followers    │  │ status       │  └──────────────┘
│ niches       │  │ (pending/appr)│
└──────────────┘  └──────────────┘
```

## Password Security

```
Registration:
User Password → [Zod Validation] → [bcrypt hash] → Store in DB
(min 6 chars)   (frontend)         (salt rounds: 10)

Login:
User Input → [Find user] → [bcrypt compare] → If match: Login
             (by username)  (input vs stored)   Create session
```

## Error Handling

```
Authentication Errors:
├─ 400 "Username already taken"          → username exists
├─ 400 "Email already registered"        → email exists
├─ 400 "Invalid role"                    → role not creator/company
├─ 400 "Password must be at least 6 chars" → weak password
├─ 401 "Invalid username or password"    → user not found or wrong pwd
├─ 401 "Unauthorized"                    → not authenticated
├─ 403 "Forbidden"                       → authenticated but wrong role
└─ 500 "Registration/Login failed"       → server error
```

## Role-Based Access Examples

```
Creator Routes:
├─ GET /api/offers (browse offers)
├─ POST /api/applications (apply for offer)
├─ GET /api/creator/stats
└─ GET /api/favorites

Company Routes:
├─ POST /api/offers (create offer)
├─ GET /api/company/offers (view own offers)
├─ PATCH /api/applications/:id/approve (approve applications)
└─ GET /api/company/stats

Admin Routes:
├─ GET /api/admin/companies (view pending companies)
├─ POST /api/admin/companies/:id/approve
├─ GET /api/admin/creators
└─ POST /api/admin/creators/:id/ban
```

## Session Lifecycle

```
CREATE SESSION
├─ User logs in successfully
├─ Passport.serializeUser() → saves user.id to session
├─ Session stored in PostgreSQL with TTL
├─ HTTP-only cookie set in browser
└─ Cookie name: "connect.sid" (default)

USE SESSION
├─ Browser sends cookie with each request
├─ Server validates signature & TTL
├─ Passport.deserializeUser() → fetches full user from DB
├─ User object available as req.user
└─ Route handler processes request

DESTROY SESSION
├─ User logs out
├─ passport.serializeUser() returns no user
├─ Session cookie cleared
├─ Session marked for deletion in DB
└─ User redirected to public pages
```

## Security Checklist

```
Implemented:
✓ Password hashing (bcrypt, 10 rounds)
✓ Unique username/email constraints
✓ Session-based auth (stateful)
✓ HTTP-only cookies
✓ Secure flag (production only)
✓ User role-based access control
✓ Session TTL (7 days)
✓ Password validation (min 6 chars)

Not Implemented:
✗ Rate limiting on auth endpoints
✗ Failed login attempt tracking
✗ Account lockout
✗ Email verification
✗ Password reset/recovery
✗ CSRF protection
✗ MFA/2FA
✗ Password change endpoint
✗ Session invalidation on role change
```

## Environment Variables

```
REQUIRED:
DATABASE_URL=postgresql://...    # PostgreSQL connection
SESSION_SECRET=your-secret-key   # Session signing secret

OPTIONAL:
NODE_ENV=development|production
PORT=5000 (default)

FOR REPLIT OAUTH (if using replitAuth.ts):
REPLIT_DOMAINS=domain1,domain2
ISSUER_URL=https://replit.com/oidc
REPL_ID=...
```
