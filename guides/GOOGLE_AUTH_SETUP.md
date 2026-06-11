# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the AffiliateXchange application.

## Overview

Google OAuth allows users to sign in or register using their Gmail account. The implementation:
- Fetches user's email, first name, last name, and profile picture from Google
- Creates new accounts automatically for first-time Google users
- Links Google accounts to existing accounts with matching emails
- Defaults new Google users to 'creator' role with a default creator profile

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "AffiliateXchange Auth")
5. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields:
     - App name: AffiliateXchange
     - User support email: your email
     - Developer contact information: your email
   - Click "Save and Continue"
   - Add scopes (optional for now): Click "Save and Continue"
   - Add test users if needed: Click "Save and Continue"
   - Review and click "Back to Dashboard"

4. Return to "Credentials" and click "Create Credentials" > "OAuth client ID" again
5. Select "Web application" as the application type
6. Configure the OAuth client:
   - Name: AffiliateXchange Web Client
   - Authorized JavaScript origins:
     - For development: `http://localhost:5000`
     - For production: `https://yourdomain.com`
   - Authorized redirect URIs:
     - For development: `http://localhost:5000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
7. Click "Create"
8. Copy the **Client ID** and **Client Secret** - you'll need these next

## Step 4: Configure Environment Variables

1. Open your `.env` file (create one from `.env.example` if it doesn't exist)
2. Make sure the application name matches your latest branding:

```env
# App branding used in server logs and Google OAuth warnings
APP_NAME=AffiliateXchange
```

3. Add the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=/api/auth/google/callback
# Optional: force Google to refresh cached consent-screen text after updating credentials
# GOOGLE_OAUTH_PROMPT=consent
```

Replace `your-client-id-here` and `your-client-secret-here` with the values from Step 3. If you previously used CreatorLink credentials, update them now. After switching to the new credentials you can temporarily set `GOOGLE_OAUTH_PROMPT=consent` to force Google to refresh the consent screen and display the AffiliateXchange name.

**For Replit deployments:**
- Go to Tools → Secrets
- Add `GOOGLE_CLIENT_ID` with your client ID
- Add `GOOGLE_CLIENT_SECRET` with your client secret
- Add `GOOGLE_CALLBACK_URL` with `/api/auth/google/callback`
- (Optional) Add `APP_NAME` if you want logs to reference a different brand name
- (Optional) Add `GOOGLE_OAUTH_PROMPT` and set it to `consent` when rotating credentials

## Step 5: Run Database Migration

The Google OAuth implementation requires a database schema update to add the `googleId` field.

```bash
psql $DATABASE_URL -f db/migrations/006_add_google_oauth.sql
```

This migration:
- Adds `google_id` column to the users table (nullable and unique)
- Makes `password` column nullable (for OAuth-only users)
- Creates an index on `google_id` for faster lookups

## Step 6: Restart Your Application

After configuring the environment variables and running the migration:

```bash
npm run dev
```

The server should log: `[Google Auth] Google OAuth authentication configured successfully`

If you see: `[Google Auth] Google OAuth credentials not configured. Skipping Google authentication setup.` - check that your environment variables are correctly set.

## How It Works

### For New Users

1. User clicks "Continue with Google" on login or register page
2. User is redirected to Google's OAuth consent screen
3. User grants permission to access their email and profile
4. Google redirects back to `/api/auth/google/callback`
5. Backend:
   - Checks if user exists with this Google ID
   - If not, checks if user exists with this email
   - If user doesn't exist, creates new account with:
     - Email from Google
     - Username generated from email (e.g., `john` from `john@gmail.com`)
     - First name and last name from Google profile
     - Profile image URL from Google
     - Default role: 'creator'
     - Auto-created creator profile
6. User is logged in and redirected to appropriate dashboard

### For Existing Users

If a user already has an account with the same email:
- The Google ID is linked to their existing account
- They can now use either password or Google to log in
- Their profile information is updated with Google data if missing

### For Returning Google Users

1. User clicks "Continue with Google"
2. User is recognized by their Google ID
3. User is logged in immediately
4. Redirected to dashboard based on their role

## User Data Fetched from Google

The implementation fetches and uses:
- **Email** (required) - Used as primary identifier
- **First Name** - Stored in `firstName` field
- **Last Name** - Stored in `lastName` field
- **Profile Picture** - Stored in `profileImageUrl` field
- **Google ID** - Stored in `googleId` field for account linking

## Security Features

- Users without passwords (OAuth-only) cannot use traditional login
- Google ID is unique and indexed for fast lookups
- Email is used to link Google accounts to existing accounts
- Account linking only happens if Google ID is not already set
- All OAuth state is handled securely by Passport.js
- Session-based authentication after Google OAuth completes

## Troubleshooting

### "Google OAuth credentials not configured"

**Solution:** Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your environment variables.

### "Redirect URI mismatch" error

**Solution:**
1. Check that the redirect URI in Google Cloud Console exactly matches your callback URL
2. For local development: `http://localhost:5000/api/auth/google/callback`
3. For production: `https://yourdomain.com/api/auth/google/callback`

### Database error: "column google_id does not exist"

**Solution:** Run the migration:
```bash
psql $DATABASE_URL -f db/migrations/006_add_google_oauth.sql
```

### "No email found in Google profile"

**Solution:** Ensure that the Google account being used has a verified email address and that the OAuth consent screen is properly configured to request the email scope.

### Users can't login after migration

**Solution:** The migration makes the password field nullable. Existing users with passwords can still log in normally. Only new Google OAuth users will have `null` passwords.

## Testing

1. **Test New User Registration:**
   - Click "Continue with Google" on register page
   - Sign in with a Google account that hasn't been used before
   - Verify you're redirected to `/browse` (creator role)
   - Check that your profile has Google data

2. **Test Existing User Login:**
   - Create an account using traditional registration
   - Logout
   - Click "Continue with Google" with the same email
   - Verify account is linked and you can login

3. **Test Returning Google User:**
   - Login with Google once
   - Logout
   - Login with Google again
   - Verify immediate login without registration

## Production Deployment

Before deploying to production:

1. **Update OAuth Consent Screen:**
   - Change from "Testing" to "In Production" in Google Cloud Console
   - Complete all required verification steps

2. **Update Redirect URIs:**
   - Add production domain to authorized redirect URIs
   - Example: `https://affiliatexchange.com/api/auth/google/callback`

3. **Update Environment Variables:**
   - Confirm `APP_NAME` reflects your public-facing brand (e.g., `AffiliateXchange`)
   - Set production `GOOGLE_CALLBACK_URL` if different from default
   - Ensure `NODE_ENV=production` for secure cookies
   - After rotating credentials, temporarily set `GOOGLE_OAUTH_PROMPT=consent` to refresh the consent screen branding

4. **SSL/HTTPS:**
   - Ensure your production app uses HTTPS
   - Google OAuth requires HTTPS in production

## Files Modified/Created

- `shared/schema.ts` - Added `googleId` field to users table
- `db/migrations/006_add_google_oauth.sql` - Database migration
- `server/googleAuth.ts` - Google OAuth strategy and routes (NEW)
- `server/localAuth.ts` - Integration with Google OAuth
- `server/storage.ts` - Added `getUserByGoogleId()` method
- `client/src/pages/login.tsx` - Added "Continue with Google" button
- `client/src/pages/register.tsx` - Added "Continue with Google" button
- `.env.example` - Added Google OAuth configuration

## Support

For issues or questions about Google OAuth setup:
1. Check the [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
2. Verify your configuration matches this guide
3. Check server logs for specific error messages
