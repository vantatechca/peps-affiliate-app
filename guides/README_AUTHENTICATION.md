# AffiliateXchange Authentication System Documentation

Welcome! This directory contains comprehensive documentation about the AffiliateXchange authentication system. Use this index to navigate through the documentation.

## Quick Start - Choose Your Entry Point

### I just want a quick overview
Start here: **[AUTH_QUICK_REFERENCE.md](AUTH_QUICK_REFERENCE.md)** (5 min read)
- Visual diagrams and ASCII flowcharts
- Quick architecture overview
- Role-based access patterns

### I need to understand the full system
Start here: **[AUTHENTICATION_OVERVIEW.md](AUTHENTICATION_OVERVIEW.md)** (15 min read)
- Comprehensive 14-section guide
- Current architecture details
- User models and database schema
- All API endpoints
- Security features and limitations

### I need to implement or modify auth
Start here: **[AUTH_CODE_EXAMPLES.md](AUTH_CODE_EXAMPLES.md)** (10 min read)
- Real code snippets from the codebase
- Backend setup walkthrough
- Route handler implementations
- Frontend component examples
- Best practices and common pitfalls

---

## Documentation Files Overview

### 1. AUTH_QUICK_REFERENCE.md
A visual quick reference guide with:
- System architecture diagrams
- Registration flow (ASCII diagram)
- Login flow (ASCII diagram)
- Middleware chain diagram
- Database relationships
- Error handling guide
- Role-based access examples
- Session lifecycle
- Security checklist

**Best for:** Getting a quick visual understanding of the system

### 2. AUTHENTICATION_OVERVIEW.md
The most comprehensive guide covering:
1. Current authentication architecture
2. User model & database schema
3. Authentication routes & API endpoints
4. Frontend authentication components
5. Middleware & role-based access control
6. OAuth & third-party integrations
7. Password security
8. Session management
9. User account status management
10. Current limitations & missing features
11. Key files reference
12. Environment variables required
13. Authentication flow diagrams
14. Next steps for Gmail OAuth integration

**Best for:** Full understanding, future planning, onboarding

### 3. AUTH_CODE_EXAMPLES.md
Code-focused documentation with:
- File location reference
- Backend setup code (localAuth.ts)
- Route implementations (register, login, logout)
- Storage layer examples
- Frontend components (Login, Register, useAuth)
- Role-based access patterns
- Password hashing examples
- Session cookie details
- Error handling patterns
- Database schema (Drizzle ORM)
- Common pitfalls

**Best for:** Implementation, debugging, learning by example

---

## Key System Information at a Glance

### Authentication Method
- **Type:** Session-based stateful authentication
- **Strategy:** Passport.js Local Strategy (username/password)
- **Password Hashing:** bcrypt (10 salt rounds)
- **Session Storage:** PostgreSQL
- **Session Duration:** 7 days

### User Roles
1. **creator** - Video content creators
2. **company** - Brands/companies posting offers
3. **admin** - Platform administrators

### Core API Endpoints
```
POST   /api/auth/register   - Create new account
POST   /api/auth/login      - Login with credentials
POST   /api/auth/logout     - Logout and clear session
GET    /api/auth/user       - Get authenticated user info
```

### Technology Stack
- **Backend:** Express.js, Passport.js, bcrypt
- **Database:** PostgreSQL with Drizzle ORM
- **Frontend:** React 18, React Query, Zod validation
- **Session Store:** connect-pg-simple

### Security Features
- bcrypt password hashing (10 rounds)
- HTTP-only secure cookies
- Role-based access control (RBAC)
- Session-based authentication
- Unique username/email constraints
- Account status management

### Known Limitations
- No password reset/recovery mechanism
- No email verification on registration
- No rate limiting on auth endpoints
- No failed login attempt tracking
- No MFA/2FA support
- Limited password requirements (6 chars minimum)

---

## Common Tasks & Where to Find Info

| Task | Documentation | Section |
|------|---|---|
| Understand how login works | Quick Reference | Login Flow |
| Set up authentication | Code Examples | #2 Backend Setup |
| Create a new auth route | Code Examples | #3-4 Route Implementation |
| Understand user roles | Overview | #5 Middleware & RBAC |
| Implement password reset | Overview | #10 Missing Features |
| Add Google OAuth | Overview | #14 Next Steps for Gmail |
| Check API endpoints | Overview | #3 Routes & Endpoints |
| Review database schema | Code Examples | #11 Database Schema |
| Debug auth issues | Quick Reference | Error Handling |
| Implement rate limiting | Overview | #10 Limitations |

---

## Environment Variables Needed

### Required
```
DATABASE_URL=postgresql://user:pass@host:port/db
SESSION_SECRET=your-secret-key-here
```

### Optional
```
NODE_ENV=development|production
PORT=5000
```

### For OAuth (when implementing)
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

---

## File Structure

```
AffiliateXchange/
├── README_AUTHENTICATION.md        ← You are here
├── AUTHENTICATION_OVERVIEW.md      ← Detailed guide
├── AUTH_QUICK_REFERENCE.md        ← Visual reference
├── AUTH_CODE_EXAMPLES.md          ← Code snippets
│
├── server/
│   ├── localAuth.ts               # Main auth setup
│   ├── replitAuth.ts              # Replit OAuth (not active)
│   ├── routes.ts                  # API routes
│   ├── storage.ts                 # Database layer
│   └── index.ts                   # Server entry
│
├── client/src/
│   ├── hooks/useAuth.ts           # Auth React hook
│   ├── pages/
│   │   ├── login.tsx              # Login page
│   │   └── register.tsx           # Register page
│   └── lib/authUtils.ts           # Auth utilities
│
└── shared/
    └── schema.ts                  # Database schemas
```

---

## How the System Works (High Level)

### User Registration
1. User fills registration form (Creator or Company)
2. Frontend validates with Zod
3. POST to `/api/auth/register`
4. Backend validates uniqueness, hashes password
5. Creates user + role-specific profile
6. Auto-login user with session
7. Redirect to dashboard

### User Login
1. User enters username + password
2. POST to `/api/auth/login`
3. Passport finds user, bcrypt compares password
4. Creates session in PostgreSQL
5. Sets HTTP-only secure cookie
6. Returns user data with role
7. Frontend redirects based on role

### Protected Routes
1. Client sends request with session cookie
2. Passport deserializes user from session
3. Middleware checks `requireAuth` or `requireRole`
4. Route handler processes if authorized
5. Returns 401/403 if not authenticated/authorized

---

## Next Steps

### For Understanding
1. Read AUTH_QUICK_REFERENCE.md (5 min)
2. Read AUTHENTICATION_OVERVIEW.md (15 min)
3. Skim AUTH_CODE_EXAMPLES.md for relevant sections (10 min)

### For Development
1. Identify what you need to build
2. Find relevant section in documentation
3. Check AUTH_CODE_EXAMPLES.md for implementation
4. Refer to AUTHENTICATION_OVERVIEW.md for details

### For Gmail OAuth Integration
See Section #14 in AUTHENTICATION_OVERVIEW.md for detailed steps:
1. Install passport-google-oauth20
2. Create Google OAuth strategy
3. Handle user linking
4. Add frontend buttons
5. Update environment variables

---

## Questions to Help You Navigate

- **Q: How does the login process work?**
  A: See "Login Flow" in AUTH_QUICK_REFERENCE.md

- **Q: What's the database schema?**
  A: See Section #2 in AUTHENTICATION_OVERVIEW.md

- **Q: How do I protect a route?**
  A: See Section #5 in AUTHENTICATION_OVERVIEW.md or #7 in AUTH_CODE_EXAMPLES.md

- **Q: What API endpoints are available?**
  A: See Section #3 in AUTHENTICATION_OVERVIEW.md

- **Q: How is the password secured?**
  A: See Section #7 in AUTHENTICATION_OVERVIEW.md and #8 in AUTH_CODE_EXAMPLES.md

- **Q: How do I implement a new feature?**
  A: See AUTH_CODE_EXAMPLES.md for similar implementations

- **Q: What's missing from the current system?**
  A: See Section #10 in AUTHENTICATION_OVERVIEW.md

---

## Additional Resources

### Passport.js Documentation
- Local Strategy: http://www.passportjs.org/docs/username-password/
- Session Integration: http://www.passportjs.org/docs/configure-api/

### Security Best Practices
- OWASP Authentication Cheat Sheet
- bcrypt documentation and best practices
- Session security standards

### Technology Docs
- Express.js: https://expressjs.com/
- React Query: https://tanstack.com/query/latest
- Drizzle ORM: https://orm.drizzle.team/
- Zod: https://zod.dev/

---

## Summary

You now have three comprehensive documentation files:
1. **AUTH_QUICK_REFERENCE.md** - Visual overview (fastest)
2. **AUTHENTICATION_OVERVIEW.md** - Complete reference (most detailed)
3. **AUTH_CODE_EXAMPLES.md** - Implementation guide (most practical)

Choose the document that best fits your needs and dive in! For a complete understanding, read all three in order.

---

Last Updated: October 31, 2025
Status: Complete and comprehensive
