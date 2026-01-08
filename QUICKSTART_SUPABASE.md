# Quick Start: Connect to New Supabase Project

This is a quick guide to get your new Supabase database connected and running. For detailed information, see `SUPABASE_SETUP.md`.

## Prerequisites

- [ ] Supabase account (https://supabase.com)
- [ ] Node.js and npm installed
- [ ] Git repository cloned

## Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `personalfinance2`
   - **Password**: (generate strong password, save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 1-2 minutes for setup

## Step 2: Get Connection String (2 minutes)

1. In Supabase Dashboard, click **Settings** (gear icon)
2. Go to **Database** section
3. Find **Connection Pooling** section
4. Copy the **URI** (should include `:6543/postgres`)
5. It looks like:
   ```
   postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
   ```

## Step 3: Update Local Configuration (1 minute)

### Option A: Use provided template
```bash
# Copy the Supabase template
cp .env.supabase.example .env.active

# Edit it with your connection string
nano .env.active
```

### Option B: Manual update
```bash
# Edit your .env.active
nano .env.active
```

Add/update this line:
```env
DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

**Important**:
- Use port **6543** (connection pooler), not 5432
- Add `?pgbouncer=true&connection_limit=1` at the end

## Step 4: Switch to PostgreSQL (1 minute)

```bash
# Run the switch script
./scripts/switch-to-postgresql.sh

# Or manually edit prisma/schema.prisma line 9:
# Change: provider = "sqlite"
# To:     provider = "postgresql"
```

## Step 5: Test Connection (1 minute)

```bash
# Test if Supabase is reachable
npm run test:supabase
```

You should see:
```
✅ Connection established
✅ Query successful
✅ All Supabase tests passed!
```

If it fails, check:
- [ ] Connection string is correct
- [ ] Using port 6543 (not 5432)
- [ ] Supabase project is active (not paused)
- [ ] Password is correct

## Step 6: Initialize Database (2 minutes)

```bash
# Generate Prisma client
npx prisma generate

# Create tables in Supabase
npx prisma db push

# Seed with default categories
npm run db:seed
```

You should see:
```
✅ Created category: Income
✅ Created category: Housing
... (9 categories total)
✅ Database seeded successfully
```

## Step 7: Start Development (1 minute)

```bash
# Start the dev server
npm run dev
```

Visit http://localhost:3000 and try:
1. Sign up for a new account
2. Login
3. Create a transaction

## Step 8: Deploy to Vercel (Optional)

If you want to deploy to production:

1. **Add environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `DATABASE_URL` with your Supabase connection string
   - Add `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - Add `NEXTAUTH_URL` (your deployment URL)

2. **Push to trigger deployment:**
   ```bash
   git push origin your-branch
   ```

3. **After deployment, seed production database:**
   ```bash
   # Using Vercel CLI
   vercel env pull .env.production.local
   npm run db:seed

   # Or via API endpoint
   curl -X POST https://your-app.vercel.app/api/migrate
   ```

## Troubleshooting

### "Can't reach database server"
- Check Supabase project is active (Dashboard → Project Status)
- Verify connection string is correct
- Ensure using port 6543

### "Too many connections"
- Use connection pooling URL (port 6543)
- Add `?pgbouncer=true&connection_limit=1` to connection string

### "Authentication failed"
- Double-check password in connection string
- Password may contain special characters that need URL encoding

### Still having issues?
Check the detailed guide: `SUPABASE_SETUP.md`

## Quick Commands Reference

```bash
# Test connection
npm run test:supabase

# Switch database type
./scripts/switch-to-postgresql.sh    # SQLite → PostgreSQL
./scripts/switch-to-sqlite.sh        # PostgreSQL → SQLite

# Database operations
npx prisma generate                   # Generate Prisma client
npx prisma db push                    # Apply schema to database
npx prisma studio                     # Open database viewer
npm run db:seed                       # Seed categories

# Development
npm run dev                           # Start dev server (Supabase)
npm run dev:local                     # Start dev server (SQLite)
npm test                              # Run tests
```

## What's Next?

✅ Database connected to Supabase
✅ Tables created
✅ Categories seeded
✅ Ready for development

Now you can:
- Build new features
- Test authentication flow
- Upload transaction CSVs
- Deploy to production

## Need Help?

- **Detailed Setup**: See `SUPABASE_SETUP.md`
- **Environment Config**: See `CLAUDE.md` (Environment Variables section)
- **Deployment**: See `CLAUDE.md` (Deployment section)
- **Supabase Docs**: https://supabase.com/docs

---

Total time: ~15 minutes ⚡
