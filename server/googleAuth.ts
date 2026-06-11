import type { Express } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { User } from "../shared/schema";

// Google OAuth Strategy Configuration
export async function setupGoogleAuth(app: Express) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appName = process.env.APP_NAME || "AffiliateXchange";
  const googlePrompt = process.env.GOOGLE_OAUTH_PROMPT;

  // Build absolute callback URL
  const port = process.env.PORT || 3000;
  const baseURL = process.env.BASE_URL || `http://localhost:${port}`;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL
    ? (process.env.GOOGLE_CALLBACK_URL.startsWith('http')
        ? process.env.GOOGLE_CALLBACK_URL
        : `${baseURL}${process.env.GOOGLE_CALLBACK_URL}`)
    : `${baseURL}/api/auth/google/callback`;

  // Only setup Google auth if credentials are provided
  if (!googleClientId || !googleClientSecret) {
    console.log("[Google Auth] Google OAuth credentials not configured. Skipping Google authentication setup.");
    return;
  }

  console.log("[Google Auth] Callback URL:", callbackURL);

  if (googleClientId?.toLowerCase().includes("creatorlink")) {
    console.warn(
      `[Google Auth] GOOGLE_CLIENT_ID is still configured for the legacy CreatorLink project. Update your Google OAuth credentials so the consent screen shows the current ${appName} branding.`
    );
  }

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName;
          const lastName = profile.name?.familyName;

          // Get Google profile picture and add size parameter for better loading
          let profileImageUrl = profile.photos?.[0]?.value;
          if (profileImageUrl && !profileImageUrl.includes('=s')) {
            // Add size parameter (s200-c = 200px square, cropped)
            profileImageUrl = `${profileImageUrl}=s200-c`;
          }

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          // Check if user already exists with this Google ID
          let user = await storage.getUserByGoogleId(googleId);

          if (user) {
            // User exists with this Google ID - log them in
            return done(null, user);
          }

          // Check if user exists with this email (might be a local account)
          user = await storage.getUserByEmail(email);

          if (user) {
            // User exists with this email but no Google ID - link the accounts
            if (user.googleId) {
              // This shouldn't happen, but if it does, it's a data inconsistency
              return done(new Error("Account linking error"), undefined);
            }

            // Update the user with Google ID to link accounts
            const updatedUser = await storage.updateUser(user.id, {
              googleId: googleId,
              firstName: firstName || user.firstName,
              lastName: lastName || user.lastName,
              profileImageUrl: profileImageUrl || user.profileImageUrl,
            });

            return done(null, updatedUser);
          }

          // New user - store Google data in session for role selection
          // Generate username from email (before @)
          const baseUsername = email.split("@")[0];
          let username = baseUsername;
          let counter = 1;

          // Check if username exists, if so, add a counter
          while (await storage.getUserByUsername(username)) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          // Return a special user object indicating role selection is needed
          // This will be stored in the session temporarily
          return done(null, {
            isNewGoogleUser: true,
            googleId: googleId,
            email: email,
            username: username,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImageUrl: profileImageUrl || null,
          } as any);
        } catch (error) {
          console.error("[Google Auth] Error during authentication:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    const authenticateOptions: Record<string, unknown> = {
      scope: ["profile", "email"],
    };

    if (googlePrompt) {
      authenticateOptions.prompt = googlePrompt;
    }

    return passport.authenticate("google", authenticateOptions)(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google_auth_failed" }),
    (req, res) => {
      // Check if this is a new Google user needing role selection
      const user = req.user as any;

      if (user.isNewGoogleUser) {
        // Store Google user data in session for role selection
        (req.session as any).pendingGoogleUser = user;
        return res.redirect("/select-role");
      }

      // Check if 2FA is enabled for this user
      if (user.twoFactorEnabled) {
        // Store user ID in session for 2FA verification
        (req.session as any).pending2FAUserId = user.id;
        // Logout the user (they were auto-logged in by passport)
        req.logout((err) => {
          if (err) {
            console.error("[Google Auth] Error logging out for 2FA:", err);
          }
          // Redirect to 2FA verification page
          return res.redirect(`/login?require2fa=true&userId=${user.id}`);
        });
        return;
      }

      // Existing user without 2FA - redirect based on role
      if (user.role === "creator") {
        res.redirect("/browse");
      } else if (user.role === "company") {
        res.redirect("/company/dashboard");
      } else if (user.role === "admin") {
        res.redirect("/admin");
      } else {
        res.redirect("/");
      }
    }
  );

  // API endpoint to complete Google OAuth registration with role selection
  app.post("/api/auth/google/complete-registration", async (req, res) => {
    try {
      const { role } = req.body;
      const pendingUser = (req.session as any).pendingGoogleUser;

      if (!pendingUser) {
        return res.status(400).json({ error: "No pending Google registration found" });
      }

      if (!role || !["creator", "company"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'creator' or 'company'" });
      }

      // Create the user with the selected role
      const newUser = await storage.createUser({
        username: pendingUser.username,
        email: pendingUser.email,
        password: null, // No password for OAuth users
        googleId: pendingUser.googleId,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        profileImageUrl: pendingUser.profileImageUrl,
        role: role,
        accountStatus: 'active',
      });

      // Create role-specific profile
      if (role === 'creator') {
        await storage.createCreatorProfile({
          userId: newUser.id,
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
          userId: newUser.id,
          legalName: pendingUser.username,
          tradeName: null,
          websiteUrl: null,
          description: null,
          logoUrl: null,
          industry: null,
          companySize: null,
          yearFounded: null,
          contactName: pendingUser.firstName && pendingUser.lastName
            ? `${pendingUser.firstName} ${pendingUser.lastName}`
            : null,
          contactJobTitle: null,
          phoneNumber: null,
          businessAddress: null,
          verificationDocumentUrl: null,
          status: 'pending',
          rejectionReason: null,
        });
      }

      // Clear pending user from session
      delete (req.session as any).pendingGoogleUser;

      // Log the user in
      req.login(newUser, (err) => {
        if (err) {
          console.error("[Google Auth] Login error after registration:", err);
          return res.status(500).json({ error: "Registration successful but login failed" });
        }

        res.json({
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
          },
          role: newUser.role,
        });
      });
    } catch (error: any) {
      console.error("[Google Auth] Registration completion error:", error);
      res.status(500).json({ error: error.message || "Failed to complete registration" });
    }
  });

  console.log("[Google Auth] Google OAuth authentication configured successfully");
}
