# AffiliateXchange - Affiliate Marketplace Platform

A comprehensive multi-sided marketplace connecting video content creators with brands for affiliate marketing opportunities and monthly retainer contracts.

## Features

- **Custom Authentication**: Username/password authentication with role-based access (Creator, Company, Admin)
- **Offer Management**: Companies create affiliate offers with 6-12 promotional videos
- **Monthly Retainers**: Long-term creator contracts for producing 30-50 videos/month
- **Auto-Approval**: Applications automatically approved after 7 minutes with tracking link generation
- **Click Tracking**: Advanced analytics with geo-location, device detection, and unique visitor tracking
- **Real-time Messaging**: WebSocket-based communication between creators and companies
- **Analytics Dashboards**: Comprehensive performance tracking for both creators and companies
- **Review System**: Creators can review offers and companies
- **Payment Processing**: Stripe integration with 7% platform fees

## Tech Stack

- **Frontend**: React + TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Real-time**: WebSocket (ws library)
- **Storage**: Google Cloud Storage for videos and media
- **Authentication**: Passport.js with bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- Google Cloud Storage bucket (optional, for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AffiliateXchange
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Session
   SESSION_SECRET=your-random-secret-key-here
   
   # Environment
   NODE_ENV=development
   
   # Stripe (optional)
   STRIPE_SECRET_KEY=sk_test_...
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   
   # Object Storage (optional)
   DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
   ```

4. **Set up the database**
   
   Push the schema to your database:
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5000`

## VS Code Setup

This project includes VS Code configuration for an optimal development experience.

### Recommended Extensions

When you open the project in VS Code, you'll be prompted to install recommended extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag
- ES7 React/Redux snippets
- Path Intellisense
- TypeScript

### Available Tasks

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and search for "Tasks: Run Task":
- **Start Dev Server**: Launches the full-stack development server
- **Build**: Creates production build
- **Push Database Schema**: Syncs database schema

### Debugging

Press `F5` to start debugging the server with breakpoints support.

## Project Structure

```
AffiliateXchange/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and helpers
│   │   └── hooks/          # Custom React hooks
├── server/                 # Backend Express application
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   ├── db.ts               # Database connection
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle database schema
├── scripts/                # Utility scripts
│   └── export-database.ts  # Database export tool
└── attached_assets/        # Static assets

```

## Available Scripts

```bash
# Development
npm run dev              # Start development server

# Database
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio (database GUI)

# Build
npm run build            # Build for production
npm run start            # Start production server

# Export
npx tsx scripts/export-database.ts  # Export database to JSON
```

## Database Export & Migration

To export your data for backup or migration:

```bash
# Export to JSON
npx tsx scripts/export-database.ts

# Export to SQL (PostgreSQL)
pg_dump $DATABASE_URL > database-dump.sql
```

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions.

## Environment Setup

### Local PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt-get install postgresql  # Ubuntu

# Create database
createdb affiliatexchange

# Set DATABASE_URL
export DATABASE_URL=postgresql://localhost/affiliatexchange
```

### Hosted Database Options

- **Neon.tech**: Free tier, serverless PostgreSQL (same as Replit)
- **Supabase**: Free tier with additional features
- **Railway**: Simple deployment platform
- **Vercel Postgres**: Integrated with Vercel deployments

## Design System

The application uses a vibrant blue primary color theme (210° 90% 55%) with comprehensive light/dark mode support. Design guidelines are documented in [design_guidelines.md](./design_guidelines.md).

## API Documentation

### Authentication

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/user` - Get current user

### Offers (Creator)

- `GET /api/offers` - List all offers
- `GET /api/offers/:id` - Get offer details
- `POST /api/applications` - Apply to an offer

### Offers (Company)

- `POST /api/company/offers` - Create new offer
- `GET /api/company/offers` - List company's offers
- `POST /api/offers/:id/videos` - Upload promotional video

### Retainer Contracts

- `GET /api/retainer-contracts` - List all contracts
- `POST /api/company/retainer-contracts` - Create contract
- `POST /api/creator/retainer-contracts/:id/apply` - Apply to contract

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Port Already in Use

If port 5000 is in use, kill the process:
```bash
# macOS/Linux
lsof -ti:5000 | xargs kill

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Not Found Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions:
- Check the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for database-related questions
- Review the code documentation in `replit.md`
- Open an issue in the repository

---

**Built with ❤️ for creators and brands**
