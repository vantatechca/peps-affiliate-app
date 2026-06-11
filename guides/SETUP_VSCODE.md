# VS Code Setup Guide

This guide will help you set up the AffiliateXchange project in Visual Studio Code.

## Quick Start (5 Minutes)

### 1. Download & Open Project

1. Download all project files from Replit (or clone from git)
2. Open folder in VS Code: `File → Open Folder`
3. VS Code will prompt you to install recommended extensions → Click **Install All**

### 2. Install Dependencies

Open the integrated terminal (`Ctrl + ~` or `` Ctrl + ` ``) and run:

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your database credentials
```

**Minimum required variables:**
```env
DATABASE_URL=postgresql://localhost/affiliatexchange
SESSION_SECRET=change-this-to-random-string
NODE_ENV=development
```

### 4. Set Up Database

```bash
# Create database (if using local PostgreSQL)
createdb affiliatexchange

# Push schema to database
npm run db:push
```

### 5. Start Development Server

**Option A: Using VS Code Task**
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Search for "Tasks: Run Task"
- Select "Start Dev Server"

**Option B: Using Terminal**
```bash
npm run dev
```

✅ **Done!** Open http://localhost:5000

---

## VS Code Features

### Recommended Extensions

The project includes recommended extensions. Install them for the best experience:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Autocomplete for Tailwind classes
- **Auto Rename Tag**: Automatically rename paired HTML/JSX tags
- **ES7 React Snippets**: React code snippets
- **Path Intellisense**: Autocomplete for file paths
- **TypeScript**: Enhanced TypeScript support

### Debugging

Press `F5` to start debugging the server with breakpoint support!

The debugger is pre-configured to:
- Run the server with `tsx`
- Set environment to development
- Display output in integrated terminal
- Skip Node.js internal files

**Set breakpoints by clicking in the gutter next to line numbers**

### VS Code Tasks

Press `Ctrl+Shift+P` → "Tasks: Run Task":

1. **Start Dev Server** - Launches full-stack app
2. **Build** - Creates production build
3. **Push Database Schema** - Syncs database

### IntelliSense & TypeScript

The project is fully typed with TypeScript. You get:

- ✅ Autocomplete for all functions and components
- ✅ Type checking as you code
- ✅ Jump to definition (`F12`)
- ✅ Find all references (`Shift+F12`)
- ✅ Rename symbol (`F2`)

---

## Database Setup Options

### Option 1: Local PostgreSQL

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql
createdb affiliatexchange

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb affiliatexchange

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

### Option 2: Hosted Database (Easiest)

**Neon.tech (Recommended)**
1. Go to https://neon.tech
2. Create free account
3. Create new project
4. Copy connection string
5. Paste into `.env` as `DATABASE_URL`

**Supabase**
1. Go to https://supabase.com
2. Create new project
3. Settings → Database → Copy connection string
4. Use "Connection pooling" string
5. Paste into `.env` as `DATABASE_URL`

### Option 3: Import Existing Data

If you have a database export from Replit:

```bash
# Import from SQL dump
psql $DATABASE_URL < database-dump.sql

# Or push schema and import JSON (requires custom script)
npm run db:push
# Then run import script
```

---

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors

Test connection:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

Check your `.env` file has the correct `DATABASE_URL`

### Port 5000 already in use

```bash
# macOS/Linux
lsof -ti:5000 | xargs kill

# Windows
netstat -ano | findstr :5000
# Note the PID, then:
taskkill /PID <PID> /F
```

### TypeScript errors in VS Code

1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Make sure you're using workspace TypeScript: Check bottom right of VS Code

---

## Project Structure

```
affiliatexchange/
├── .vscode/                # VS Code configurations
│   ├── extensions.json     # Recommended extensions
│   ├── launch.json         # Debugger config
│   └── tasks.json          # Available tasks
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database layer
│   └── index.ts            # Server entry
├── shared/                 # Shared code
│   └── schema.ts           # Database schema (Drizzle ORM)
├── .env.example            # Environment template
├── .gitignore              # Git exclusions
├── README.md               # Full documentation
└── package.json            # Dependencies & scripts
```

---

## Development Workflow

### Typical Development Session

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Make changes** to files in `client/` or `server/`

3. **Changes auto-reload** - Vite HMR for frontend, nodemon for backend

4. **Check the browser** at http://localhost:5000

5. **Debug if needed** - Press `F5` and set breakpoints

### Database Changes

1. **Edit schema** in `shared/schema.ts`

2. **Push to database**
   ```bash
   npm run db:push
   ```

3. **View database** (optional)
   ```bash
   npm run db:studio
   ```

### Code Quality

The project uses:
- **TypeScript** for type safety
- **ESLint** for code quality (install extension)
- **Prettier** for formatting (install extension)

Enable "Format on Save" in VS Code settings for best experience.

---

## Important Files

### Must Configure

- `.env` - Environment variables (copy from `.env.example`)
- `shared/schema.ts` - Database schema

### Reference Docs

- `README.md` - Full project documentation
- `MIGRATION_GUIDE.md` - Database export/import guide
- `design_guidelines.md` - UI/UX design system
- `replit.md` - Project architecture notes

---

## Keyboard Shortcuts (VS Code)

- `Ctrl+~` - Toggle terminal
- `Ctrl+Shift+P` - Command palette
- `F5` - Start debugging
- `Ctrl+P` - Quick file open
- `F12` - Go to definition
- `Shift+F12` - Find all references
- `F2` - Rename symbol
- `Ctrl+/` - Toggle comment

---

## Getting Help

1. Check [README.md](./README.md) for full documentation
2. Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for database setup
3. Check VS Code problems panel (`Ctrl+Shift+M`)
4. Review console logs in browser DevTools

---

## Next Steps

Once you have the project running:

1. ✅ Register a test account at http://localhost:5000/register
2. ✅ Create a company profile
3. ✅ Create an offer or retainer contract
4. ✅ Test the features

**Happy coding! 🚀**
