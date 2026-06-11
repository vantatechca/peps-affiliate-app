# Database Setup Guide

The payment management system needs a database connection to store and retrieve payment data. Follow one of the options below to get started.

## Option 1: Neon Database (Recommended - Free & Easy)

**Neon** is a serverless PostgreSQL database with a generous free tier.

### Step 1: Create a Neon Account

1. Go to https://neon.tech
2. Sign up for a free account (using GitHub, Google, or email)
3. Verify your email

### Step 2: Create a Database

1. Click **"Create a project"**
2. Choose a name (e.g., "AffiliateXchange")
3. Select a region closest to you
4. Click **"Create project"**

### Step 3: Get Your Connection String

After creating the project, you'll see a connection string that looks like:

```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Copy this entire connection string!**

### Step 4: Create .env File

1. In your project root directory, create a file named `.env`
2. Add this line (replace with your actual connection string):

```env
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 5: Push Database Schema

Run this command to create all tables:

```bash
npm run db:push
```

This will create all the necessary tables (users, payments, offers, etc.) in your Neon database.

### Step 6: Seed Payment Data

Now you can run the seed script:

```bash
npm run payment:seed
```

---

## Option 2: Local PostgreSQL Database

If you prefer to run PostgreSQL locally:

### Step 1: Install PostgreSQL

**Windows:**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Default port is 5432

**Mac (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

Open PostgreSQL command line:

**Windows:** Open "SQL Shell (psql)" from Start Menu

**Mac/Linux:**
```bash
psql -U postgres
```

Then run:
```sql
CREATE DATABASE affiliatexchange;
\q
```

### Step 3: Create .env File

Create a `.env` file in your project root:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/affiliatexchange
```

Replace `your_password` with your PostgreSQL password.

### Step 4: Push Database Schema

```bash
npm run db:push
```

### Step 5: Seed Payment Data

```bash
npm run payment:seed
```

---

## Option 3: Using Replit (If deploying there)

If you're using Replit:

1. Go to the **Tools** menu
2. Click **Secrets**
3. Add a new secret:
   - Key: `DATABASE_URL`
   - Value: Your database connection string

---

## Verify Your Setup

After setting up the database, verify it's working:

### 1. Check Connection

```bash
npm run payment:test
```

This should connect to your database and show payment statistics (even if empty).

### 2. Seed Sample Data

```bash
npm run payment:seed
```

You should see:
```
✓ Created creator: john_creator
✓ Created company profile: techcorp
✓ Created offer: Premium SaaS Affiliate Program
✓ Payment: $1000 (Platform: $40.00, Stripe: $30.00, Net: $930.00)
```

### 3. Start the App

```bash
npm run dev
```

### 4. Login and Test

- Open http://localhost:5000
- Login with:
  - Username: `john_creator`
  - Password: `password123`
- Navigate to `/payment-settings`
- You should see payment data with fee breakdowns!

---

## Troubleshooting

### "Cannot connect to database"

**Check:**
- Is your DATABASE_URL correct?
- For Neon: Did you copy the entire connection string including `?sslmode=require`?
- For local: Is PostgreSQL running?

**Test connection:**
```bash
# Install pg client (optional)
npm install -g pg

# Test connection (replace with your URL)
psql "postgresql://your-connection-string"
```

### "Relation does not exist" errors

**Solution:** Push the schema first
```bash
npm run db:push
```

### "dotenv not found" or .env not loading

**Check:**
1. Is your `.env` file in the project root directory?
2. Does it contain `DATABASE_URL=...`?
3. No spaces around the `=` sign

**Windows PowerShell:** Create .env file
```powershell
New-Item -Path .env -ItemType File -Force
notepad .env
```

Then add your DATABASE_URL and save.

### Port already in use (5000)

**Solution:** Change the port in server/index.ts or kill the process using port 5000

---

## Quick Start Commands (After Setup)

```bash
# 1. Push database schema (first time only)
npm run db:push

# 2. Seed payment data
npm run payment:seed

# 3. Start development server
npm run dev

# 4. Open browser to http://localhost:5000

# 5. Login with:
#    Username: john_creator
#    Password: password123

# 6. Navigate to /payment-settings
```

---

## .env File Template

Create a file named `.env` in your project root:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Session Secret (required)
SESSION_SECRET=your-random-secret-key-change-this-in-production

# Node Environment
NODE_ENV=development

# Optional: Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: SendGrid (for emails)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Optional: Stripe (for payment processing)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

**Minimum required:**
```env
DATABASE_URL=your-database-connection-string
SESSION_SECRET=some-random-secret-at-least-32-characters-long
```

---

## Next Steps

Once your database is connected:

1. ✅ Run `npm run payment:seed` to populate test data
2. ✅ Run `npm run dev` to start the server
3. ✅ Login with test credentials
4. ✅ Navigate to `/payment-settings`
5. ✅ See payment data with real calculated fees!

The payment management system will display:
- Gross amounts
- Platform fees (4%)
- Stripe fees (3%)
- Net amounts (93%)
- Payment status
- Complete transaction history

**All with real calculated data from the database!**

---

**Need help?** Check:
- `.env.example` file for configuration examples
- `PAYMENT_QUICK_START.md` for using the payment system
- `PAYMENT_SYSTEM_ANALYSIS.md` for technical details
