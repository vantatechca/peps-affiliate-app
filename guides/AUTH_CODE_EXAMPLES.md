# Authentication Code Examples & Implementation Reference

## 1. Core Authentication Files Location

```
/server/
├── localAuth.ts          # Main Passport.js Local Strategy setup
├── replitAuth.ts         # Alternative Replit OAuth (not active)
├── storage.ts            # Database access layer
├── routes.ts             # API route definitions
└── index.ts              # Server entry point

/client/src/
├── hooks/useAuth.ts      # React hook for auth state
├── pages/login.tsx       # Login page component
├── pages/register.tsx    # Registration page component
└── lib/authUtils.ts      # Auth utility functions
```

---

## 2. Backend Authentication Setup (localAuth.ts)

### Complete Auth Setup Code

```typescript
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// Session TTL configuration
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days

// Session middleware
function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Setup Auth
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Configure Passport Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to session (store only user.id)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (fetch fresh user from DB)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, false);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

// Authentication middleware
export function isAuthenticated(req: Request, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}
```

---

## 3. Auth Route Implementation (routes.ts excerpt)

### Registration Route

```typescript
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Validate inputs
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!["creator", "company"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if username or email already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      role,
      accountStatus: 'active',
      profileImageUrl: null,
    });

    // Create role-specific profile
    if (role === 'creator') {
      await storage.createCreatorProfile({
        userId: user.id,
        bio: null,
        youtubeUrl: null,
        tiktokUrl: null,
        instagramUrl: null,
        youtubeFollowers: null,
        tiktokFollowers: null,
        instagramFollowers: null,
        niches: [],
      });
    } else if (role === 'company') {
      await storage.createCompanyProfile({
        userId: user.id,
        legalName: username,
        tradeName: null,
        websiteUrl: null,
        description: null,
        logoUrl: null,
        industry: null,
        companySize: null,
        yearFounded: null,
        contactName: null,
        contactJobTitle: null,
        phoneNumber: null,
        businessAddress: null,
        verificationDocumentUrl: null,
        status: 'pending',
        rejectionReason: null,
      });
    }

    // Auto-login user
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ error: "Registration successful but login failed" });
      }
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role } 
      });
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});
```

### Login Route

```typescript
app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || "Invalid credentials" });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error("Session login error:", loginErr);
        return res.status(500).json({ error: "Login failed" });
      }
      
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        },
        role: user.role
      });
    });
  })(req, res, next);
});
```

### Logout Route

```typescript
app.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});
```

### Get Current User Route

```typescript
app.get("/api/auth/user", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
```

---

## 4. Storage Layer (storage.ts excerpt)

### User Database Operations

```typescript
async getUser(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

async getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

async getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

async createUser(user: InsertUser): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      ...user,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
  const result = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

async upsertUser(userData: UpsertUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}
```

---

## 5. Frontend - Login Page (login.tsx)

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // Important: include cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const result = await response.json();

      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting...",
      });

      // Redirect based on role
      setTimeout(() => {
        if (result.role === "creator") {
          window.location.href = "/browse";
        } else if (result.role === "company") {
          window.location.href = "/company/dashboard";
        } else if (result.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder="johndoe" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
```

---

## 6. Frontend - useAuth Hook (useAuth.ts)

```typescript
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Usage in components:
// const { user, isLoading, isAuthenticated } = useAuth();
// if (!isAuthenticated) return <Navigate to="/login" />;
// if (user?.role === 'creator') { /* render creator content */ }
```

---

## 7. Role-Based Access Control Pattern

```typescript
// In routes.ts - Protect routes with middleware

// Require authentication only
app.get("/api/profile", requireAuth, async (req, res) => {
  // Any authenticated user can access
});

// Require specific role
app.post("/api/offers", requireAuth, requireRole('company'), async (req, res) => {
  // Only companies can create offers
});

// Require creator role
app.get("/api/applications", requireAuth, requireRole('creator'), async (req, res) => {
  // Only creators can view their applications
});

// Require admin role
app.get("/api/admin/stats", requireAuth, requireRole('admin'), async (req, res) => {
  // Only admins can view admin stats
});

// Middleware definitions
function requireAuth(req: Request, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

function requireRole(...roles: string[]) {
  return (req: Request, res: any, next: any) => {
    if (!req.user || !roles.includes((req.user as any).role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}
```

---

## 8. Password Hashing Example

```typescript
import bcrypt from "bcrypt";

// Hashing (during registration)
const password = "userPassword123";
const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds
// Store hashedPassword in database

// Comparing (during login)
const userInput = "userPassword123";
const storedHash = user.password; // from database
const isValid = await bcrypt.compare(userInput, storedHash);

if (isValid) {
  // Password is correct
  // Create session and login
} else {
  // Password is incorrect
  // Return error
}
```

---

## 9. Session Cookie Details

```typescript
// Session cookie is automatically set/managed by Passport.js
// Cookie name: "connect.sid" (default)
// Properties:
{
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // HTTPS only in production
  sameSite: 'strict',    // CSRF protection (default in express-session)
  maxAge: 604800000,     // 7 days in milliseconds
  path: '/',             // Available on all paths
  domain: undefined,     // Current domain only
}

// Browser sends cookie with every request:
// GET /api/auth/user
// Cookie: connect.sid=abc123def456ghi789

// Server validates cookie:
// 1. Check signature with SESSION_SECRET
// 2. Fetch session from PostgreSQL
// 3. Check TTL hasn't expired
// 4. Load user data
// 5. Passport deserializes user
```

---

## 10. Error Handling Examples

```typescript
// Frontend error handling
try {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (response.status === 401) {
    // Invalid credentials
    toast({ title: "Error", description: "Invalid username or password" });
  } else if (response.status === 400) {
    // Bad request (missing fields)
    const error = await response.json();
    toast({ title: "Error", description: error.error });
  } else if (response.ok) {
    // Successful login
    const { role } = await response.json();
    // Redirect based on role
  }
} catch (error) {
  // Network error
  toast({ title: "Error", description: "Network error. Please try again." });
}

// Backend error handling
app.post("/api/auth/register", async (req, res) => {
  try {
    // Validation checks return 400
    if (!username) return res.status(400).json({ error: "Username required" });
    
    // Duplicate checks return 400
    if (existingUser) return res.status(400).json({ error: "Username taken" });
    
    // Database errors return 500
    const user = await storage.createUser(userData);
    
    // Success returns 200 with user data
    res.json({ success: true, user });
  } catch (error) {
    // Unhandled errors return 500
    res.status(500).json({ error: "Internal server error" });
  }
});
```

---

## 11. Database Schema (Drizzle ORM)

```typescript
import { pgTable, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum('user_role', ['creator', 'company', 'admin']);
export const userAccountStatusEnum = pgEnum('user_account_status', ['active', 'suspended', 'banned']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('creator'),
  accountStatus: userAccountStatusEnum("account_status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);
```

---

## 12. Common Pitfalls & Best Practices

```typescript
// CORRECT - Include credentials in fetch
fetch("/api/auth/login", {
  method: "POST",
  credentials: "include", // Send cookies with request
  body: JSON.stringify(data),
});

// WRONG - Missing credentials
fetch("/api/auth/login", {
  method: "POST",
  // cookies won't be sent or stored
});

// CORRECT - Await bcrypt operations
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(input, hash);

// WRONG - Not awaiting
const hash = bcrypt.hash(password, 10); // Returns Promise, not hash!

// CORRECT - Check authentication before accessing user data
if (req.isAuthenticated()) {
  const userId = (req.user as any).id;
  // user is authenticated
}

// WRONG - Assuming user exists without checking
const userId = (req.user as any)?.id; // Could be undefined!

// CORRECT - Role check with multiple roles
requireRole('creator', 'admin') // Creator OR admin

// WRONG - Allowing unauthenticated access to protected route
app.get("/api/profile", (req, res) => {
  // Missing requireAuth middleware!
});
```

