# AffiliateXchange Authentication System - Comprehensive Overview

## 1. Current Authentication Architecture

### Backend Authentication System (localAuth.ts)
The application uses **Passport.js with Local Strategy** for username/password authentication.

**Key Components:**
- Strategy: Passport Local Strategy (passport-local)
- Session Storage: PostgreSQL via connect-pg-simple
- Password Hashing: bcrypt (10 salt rounds)
- Session TTL: 7 days

**Session Configuration:**
```
- HTTP Only Cookies: ✓ Enabled
- Secure Flag: ✓ Enabled in production
- Max Age: 7 days (604,800,000 ms)
- Session Store Table: "sessions" (PostgreSQL)
```

### Optional Replit OAuth Integration (replitAuth.ts)
There's an alternative OAuth integration for Replit using OpenID Connect:
- Strategy: openid-client/passport with Replit OIDC
- Scope: openid, email, profile, offline_access
- Token Management: Refresh token support
- User Upsert: Creates/updates users on OAuth login

---

## 2. User Model & Database Schema

### User Table Schema (PostgreSQL)
```sql
CREATE TABLE users (
  id              varchar  PRIMARY KEY (auto-generated UUID)
  username        varchar  UNIQUE NOT NULL
  email          varchar  UNIQUE NOT NULL
  password       varchar  NOT NULL (bcrypt hashed)
  firstName      varchar  (optional)
  lastName       varchar  (optional)
  profileImageUrl varchar (optional)
  role           user_role ENUM ('creator', 'company', 'admin') DEFAULT 'creator'
  accountStatus  user_account_status ENUM ('active', 'suspended', 'banned') DEFAULT 'active'
  createdAt      timestamp DEFAULT NOW()
  updatedAt      timestamp DEFAULT NOW()
);
```

### Sessions Table Schema (PostgreSQL)
```sql
CREATE TABLE sessions (
  sid     varchar PRIMARY KEY
  sess    jsonb NOT NULL
  expire  timestamp NOT NULL
  -- Indexed on expire for cleanup
);
```

### User Roles & Access Control
**Three role types:**
1. **creator** - Video content creators, can browse/apply for offers
2. **company** - Brands/companies posting affiliate offers
3. **admin** - Platform administrators with full control

### User Profiles (Role-Specific)
- **Creator Profiles** (creatorProfiles table)
  - Bio, social media links (YouTube, TikTok, Instagram)
  - Follower counts for each platform
  - Content niches/categories

- **Company Profiles** (companyProfiles table)
  - Legal name, trade name, industry
  - Website, logo, company size, founding year
  - Contact information (name, job title, phone, address)
  - Verification document
  - Status: pending → approved/rejected

---

## 3. Authentication Routes & API Endpoints

### Core Auth Routes
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | None | User registration (creator or company) |
| `/api/auth/login` | POST | None | Username/password login |
| `/api/auth/logout` | POST | Required | Logout and clear session |
| `/api/auth/user` | GET | Required | Get current authenticated user |

### Registration Flow
**POST /api/auth/register**
```json
Request Body:
{
  "username": string (required, unique),
  "email": string (required, email format, unique),
  "password": string (required, min 6 chars),
  "firstName": string (optional),
  "lastName": string (optional),
  "role": "creator" | "company" (required)
}

Validations:
- Username: Not already taken
- Email: Valid format, not already registered
- Password: Minimum 6 characters
- Role: Only 'creator' or 'company' allowed (admin must be created separately)

Post-Registration Actions:
1. Hash password with bcrypt (10 salt rounds)
2. Create user record
3. Create role-specific profile (CreatorProfile or CompanyProfile)
4. Auto-login user
5. Return user data + redirect to dashboard
```

### Login Flow
**POST /api/auth/login**
```json
Request Body:
{
  "username": string,
  "password": string
}

Process:
1. Find user by username
2. Compare password with bcrypt hash
3. Create session on success
4. Return user data with role
5. Redirect based on role:
   - creator → /browse
   - company → /company/dashboard
   - admin → /admin
```

### Logout Flow
**POST /api/auth/logout**
- Clears session cookie
- Invalidates session in database
- Returns success response

### Profile Endpoints (After Authentication)
| Endpoint | Method | Auth | Role | Purpose |
|----------|--------|------|------|---------|
| `/api/profile` | GET | Required | Any | Get user's role-specific profile |
| `/api/profile` | PUT | Required | Any | Update user profile |
| `/api/auth/user` | GET | Required | Any | Get current user info |

---

## 4. Frontend Authentication Components

### useAuth Hook (client/src/hooks/useAuth.ts)
```typescript
- Uses React Query for API calls
- Queries `/api/auth/user` endpoint
- Provides: user, isLoading, isAuthenticated
- Automatically handles session validation
- No manual token management (cookies handle it)
```

### Login Page (client/src/pages/login.tsx)
**Features:**
- Username/password form with validation
- Zod schema validation
- Toast notifications for success/errors
- Redirect on successful login based on role
- Link to registration page
- Test IDs for automated testing

### Register Page (client/src/pages/register.tsx)
**Features:**
- Creator/Company role selection UI
- Form fields:
  - Username (min 3 chars)
  - Email (valid format)
  - Password (min 6 chars) + Confirm Password
  - First Name (optional)
  - Last Name (optional)
  - Role (radio buttons)
- Password matching validation
- Zod schema validation
- Role-based redirect after registration
- Link to login page
- Test IDs for automated testing

### Authentication Utilities (client/src/lib/authUtils.ts)
```typescript
- isUnauthorizedError(): Detects 401 responses
- Used for error handling in API calls
```

---

## 5. Middleware & Role-Based Access Control

### Authentication Middleware
**requireAuth (isAuthenticated)**
```typescript
- Checks if user is authenticated via req.isAuthenticated()
- Returns 401 "Unauthorized" if not authenticated
- Used on all protected endpoints
```

**requireRole(...roles)**
```typescript
- Checks if req.user.role matches one of allowed roles
- Returns 403 "Forbidden" if role mismatch
- Supports multiple roles per endpoint
```

### Protected Endpoints Examples
```
Creator-Only:
- GET /api/offers/recommended (browse offers)
- GET /api/applications (view applications)
- POST /api/applications (submit application)
- GET /api/favorites
- GET /api/creator/stats

Company-Only:
- POST /api/offers (create offer)
- GET /api/company/offers (view own offers)
- GET /api/company/applications (view received applications)
- PATCH /api/applications/:id/approve|reject|complete

Admin-Only:
- GET /api/admin/stats
- GET /api/admin/companies
- POST /api/admin/companies/:id/approve|reject
- GET /api/admin/creators
- POST /api/admin/creators/:id/suspend|ban
```

---

## 6. OAuth & Third-Party Auth Integrations

### Replit OAuth (replitAuth.ts) - Available but Not Used in Main Flow
**Status:** Available as alternative auth system
**Implementation Details:**
- OpenID Connect with Replit's OIDC provider
- Automatic user upsert on login
- Supports offline_access for token refresh
- Token refresh mechanism for expired tokens
- Falls back to password auth for token refresh failures

**Routes (Not in active use in localAuth):**
- `/api/login` - Initiates OAuth flow
- `/api/callback` - OAuth callback handler
- `/api/logout` - Logout with end session

### Gmail/Google OAuth - NOT YET IMPLEMENTED
**Current Status:** Branch exists (claude/add-gmail-auth) but not merged
**Missing Components:**
- passport-google-oauth20 strategy not in package.json
- No Google OAuth endpoints defined
- No Gmail account linking logic
- No UI for OAuth button in login/register

**Dependencies Available:**
- @google-cloud/storage (for file storage, not auth)
- openid-client (can be used for OAuth 2.0 flows)

---

## 7. Password Security

### Password Hashing
- Algorithm: bcrypt
- Salt Rounds: 10
- Applied during registration
- Verified using bcrypt.compare() during login

### Password Requirements
- Minimum length: 6 characters
- Frontend validation: Zod schema
- Backend validation: Before hashing and storing

### Password Reset / Forgotten Password
**NOT IMPLEMENTED** - Current system has no password recovery mechanism

---

## 8. Session Management

### Session Store (PostgreSQL)
```
- Table: "sessions"
- Columns: sid (session ID), sess (JSONB), expire (timestamp)
- TTL: 7 days
- Auto-cleanup: Handled by connect-pg-simple
```

### Session Configuration
```javascript
{
  secret: process.env.SESSION_SECRET (required),
  store: pgStore (PostgreSQL),
  resave: false (don't save if unchanged),
  saveUninitialized: false (don't create empty sessions),
  cookie: {
    httpOnly: true (no JavaScript access),
    secure: true (HTTPS only in production),
    maxAge: 604800000 (7 days in ms)
  }
}
```

### Session Serialization
- User serialized by ID: `passport.serializeUser((user, done) => done(null, user.id))`
- User deserialized from DB: Fetches fresh user data on each request
- Ensures profile/role changes are reflected immediately

---

## 9. User Account Status Management

### Account Status Types
```
- 'active' (default)
- 'suspended' (temporarily disabled)
- 'banned' (permanently disabled)
```

### Account Suspension (Admin Only)
- Endpoint: `POST /api/admin/creators/:id/suspend`
- Sets accountStatus to 'suspended'
- User can still log in but may have restricted access

### Account Banning (Admin Only)
- Endpoint: `POST /api/admin/creators/:id/ban`
- Sets accountStatus to 'banned'
- Permanent account disabling

---

## 10. Current Limitations & Missing Features

### Password Management
- ❌ Password reset / "Forgot Password"
- ❌ Email verification on registration
- ❌ Password change endpoint
- ❌ Password strength requirements (only 6 char minimum)
- ❌ Account lockout after failed attempts

### Multi-Factor Authentication
- ❌ 2FA/MFA not implemented
- ❌ Email OTP not implemented
- ❌ TOTP (authenticator app) not supported

### OAuth Integrations
- ❌ Google/Gmail OAuth
- ❌ Facebook OAuth
- ❌ GitHub OAuth
- ✓ Replit OAuth (available but not primary)

### Account Recovery
- ❌ Account recovery tokens
- ❌ Email verification system
- ❌ Account linking (connecting multiple auth methods)

### Security Features
- ❌ CSRF protection (not explicitly configured)
- ❌ Rate limiting on auth endpoints
- ❌ Failed login attempt tracking
- ❌ Account lockout after failed attempts
- ❌ Password history (preventing reuse)
- ❌ Session invalidation on password change
- ❌ Security audit logging

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| `/server/localAuth.ts` | Main auth setup with Passport Local Strategy |
| `/server/replitAuth.ts` | Alternative Replit OAuth setup (not currently used) |
| `/server/routes.ts` | All API routes including auth endpoints |
| `/server/storage.ts` | Database access layer for users |
| `/shared/schema.ts` | Drizzle ORM schema definitions |
| `/client/src/hooks/useAuth.ts` | React hook for auth state |
| `/client/src/pages/login.tsx` | Login form component |
| `/client/src/pages/register.tsx` | Registration form component |
| `/client/src/lib/authUtils.ts` | Auth utility functions |

---

## 12. Environment Variables Required

```
DATABASE_URL=postgresql://... (PostgreSQL connection string)
SESSION_SECRET=... (Secret for session signing)
NODE_ENV=development|production
PORT=5000 (default)

Optional (for Replit OAuth):
REPLIT_DOMAINS=...
ISSUER_URL=https://replit.com/oidc
REPL_ID=...
```

---

## 13. Authentication Flow Diagram

```
REGISTRATION:
┌─────────────────────────────────────────────────────────────┐
│ 1. User fills registration form (role, email, password, etc)│
├─────────────────────────────────────────────────────────────┤
│ 2. Frontend validates with Zod schema                       │
├─────────────────────────────────────────────────────────────┤
│ 3. POST /api/auth/register with credentials                │
├─────────────────────────────────────────────────────────────┤
│ 4. Backend validates:                                       │
│    - Username unique, Email unique, Role valid             │
│    - Password min 6 chars                                   │
├─────────────────────────────────────────────────────────────┤
│ 5. Hash password with bcrypt                                │
├─────────────────────────────────────────────────────────────┤
│ 6. Create user record + role-specific profile               │
├─────────────────────────────────────────────────────────────┤
│ 7. Auto-login user (create session)                         │
├─────────────────────────────────────────────────────────────┤
│ 8. Redirect to role dashboard                               │
└─────────────────────────────────────────────────────────────┘

LOGIN:
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters username + password                          │
├─────────────────────────────────────────────────────────────┤
│ 2. POST /api/auth/login                                    │
├─────────────────────────────────────────────────────────────┤
│ 3. Passport Local Strategy:                                 │
│    - Find user by username                                  │
│    - Compare password with bcrypt                           │
├─────────────────────────────────────────────────────────────┤
│ 4. On success: Create session in PostgreSQL                 │
├─────────────────────────────────────────────────────────────┤
│ 5. Set secure HTTP-only cookie                              │
├─────────────────────────────────────────────────────────────┤
│ 6. Return user data + role                                  │
├─────────────────────────────────────────────────────────────┤
│ 7. Redirect based on role                                   │
└─────────────────────────────────────────────────────────────┘

AUTHENTICATED REQUEST:
┌─────────────────────────────────────────────────────────────┐
│ 1. Client sends request with session cookie                 │
├─────────────────────────────────────────────────────────────┤
│ 2. Server validates cookie/session                          │
├─────────────────────────────────────────────────────────────┤
│ 3. Passport deserialization fetches user from DB            │
├─────────────────────────────────────────────────────────────┤
│ 4. Middleware checks requireAuth/requireRole                │
├─────────────────────────────────────────────────────────────┤
│ 5. Route handler processes request                          │
├─────────────────────────────────────────────────────────────┤
│ 6. Return response                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Next Steps for Gmail OAuth Integration

If implementing Gmail OAuth:

1. **Install Dependencies**
   - `npm install passport-google-oauth20`
   - May need `@types/passport-google-oauth20`

2. **Create Google OAuth Strategy** (similar to replitAuth.ts pattern)
   - Set up Google Cloud credentials
   - Configure callback URL
   - Define verification function

3. **User Linking**
   - Handle existing users connecting Google account
   - Handle first-time signup via Google

4. **Frontend Buttons**
   - Add "Sign in with Google" button on login/register
   - Optional: Account linking in settings

5. **Update User Model** (Optional)
   - Add googleId field to users table
   - Add table for linked OAuth accounts

6. **Environment Variables**
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_CALLBACK_URL

