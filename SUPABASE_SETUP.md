# Supabase Setup Guide

This guide walks you through creating a new Supabase project and connecting it to your Personal Finance application.

## Step 1: Create New Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Fill in project details:
     - **Name**: `personalfinance2` (or your preferred name)
     - **Database Password**: Generate a strong password (save this!)
     - **Region**: Choose closest to you (e.g., Asia Pacific - Singapore)
     - **Pricing Plan**: Free tier is fine for development

3. **Wait for Project Setup**
   - Takes 1-2 minutes to provision
   - You'll see "Setting up project..." progress indicator

## Step 2: Get Connection Strings

Once your project is ready:

1. **Navigate to Project Settings**
   - Click Settings (gear icon) in the sidebar
   - Go to "Database" section

2. **Copy Connection Strings**

   You'll need TWO connection strings:

   ### Direct Connection (for migrations/seeding)
   - Use: "URI" under "Connection string"
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
   - Example:
     ```
     postgresql://postgres.abcdefgh:MyPassword123@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
     ```

   ### Connection Pooling (for application runtime)
   - Use: "Connection pooling" URI
   - Toggle "Display connection pooler" if needed
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Example:
     ```
     postgresql://postgres.abcdefgh:MyPassword123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```

   **Important**: Use port **6543** (connection pooler) for the application, not port 5432!

## Step 3: Configure Local Environment

1. **Update .env.active**
   ```bash
   # Edit your local .env.active file
   nano .env.active
   ```

2. **Add your Supabase connection string**
   ```env
   # Use the CONNECTION POOLING URL (port 6543)
   DATABASE_URL="postgresql://postgres.[your-ref]:[your-password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

   NEXTAUTH_URL="http://localhost:3000"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   NODE_ENV="development"
   ```

   **Important**: Add these parameters to the connection string:
   - `?pgbouncer=true` - Required for connection pooling
   - `&connection_limit=1` - Prevents connection pool exhaustion

## Step 4: Update Prisma Schema

1. **Switch to PostgreSQL provider**
   ```bash
   # Edit prisma/schema.prisma
   nano prisma/schema.prisma
   ```

2. **Change the datasource provider** (line 9):
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite" to "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

## Step 5: Test Database Connection

1. **Test the connection**
   ```bash
   npm run test:supabase
   ```

   This will verify:
   - Database is reachable
   - Credentials are correct
   - Connection pooling is working

2. **If connection fails:**
   - Double-check your connection string
   - Ensure you're using port 6543 (not 5432)
   - Verify password is correct
   - Check Supabase project is not paused

## Step 6: Run Database Migrations

1. **Generate Prisma client**
   ```bash
   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
   ```

2. **Push schema to database**
   ```bash
   npx prisma db push
   ```

   This creates all tables (User, BankAccount, Transaction, Category, LearnedPattern)

3. **Verify tables were created**
   ```bash
   npx prisma studio
   ```
   Opens a browser interface to view your database

## Step 7: Seed Initial Data

1. **Run the seed script**
   ```bash
   npm run db:seed
   ```

   This creates default categories:
   - Income
   - Housing
   - Transportation
   - Food
   - Healthcare
   - Entertainment
   - Shopping
   - Utilities
   - Miscellaneous

2. **Verify seeding**
   ```bash
   npx prisma studio
   ```
   Check the "Category" table has 9 entries

## Step 8: Configure Vercel (Production)

1. **Go to Vercel Dashboard**
   - Your project → Settings → Environment Variables

2. **Update DATABASE_URL**
   - Variable: `DATABASE_URL`
   - Value: Your Supabase connection pooling URL (port 6543)
   - Environment: Production, Preview, Development

3. **Update other variables if needed**
   - `JWT_SECRET`: Generate new with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your deployment URL

4. **Redeploy**
   ```bash
   git push origin your-branch
   ```
   Vercel will automatically rebuild

## Step 9: Run Production Migrations

After Vercel deployment succeeds:

```bash
# Option 1: Via API endpoint
curl -X POST https://your-app.vercel.app/api/migrate

# Option 2: Via Vercel CLI
vercel env pull .env.production.local
npx prisma db push
```

Then seed production database:
```bash
DATABASE_URL="your-production-url" npm run db:seed
```

## Troubleshooting

### "Too many connections" error
- Use port 6543 (connection pooler) not 5432
- Add `?pgbouncer=true&connection_limit=1` to connection string

### "Can't reach database server"
- Check Supabase project is not paused
- Verify connection string is correct
- Ensure using correct region endpoint

### "Prisma engine download failed"
- Use: `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npm install --ignore-scripts`
- Then: `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate`

### "SSL connection required"
- Supabase requires SSL by default
- Connection string should include SSL settings (handled automatically)

## Quick Command Reference

```bash
# Test connection
npm run test:supabase

# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open database viewer
npx prisma studio

# Seed database
npm run db:seed

# Check database status
npm run db:status

# Start dev server
npm run dev
```

## Security Reminders

- ✅ Never commit `.env.active` to git
- ✅ Use connection pooling (port 6543) for applications
- ✅ Use direct connection (port 5432) only for migrations
- ✅ Rotate passwords if exposed
- ✅ Use strong, unique JWT_SECRET in production
- ✅ Keep Supabase project active (check billing settings)

## Next Steps

After setup is complete:
1. Test authentication (sign up, login)
2. Test transaction creation
3. Test CSV upload
4. Verify auto-categorization works
5. Run full test suite: `npm test`

Need help? Check the main documentation in `CLAUDE.md` or Supabase docs at https://supabase.com/docs
