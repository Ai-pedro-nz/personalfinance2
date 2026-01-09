#!/bin/bash

# Script to switch Prisma schema from SQLite to PostgreSQL
# Run this when you want to use Supabase/PostgreSQL

echo "🔄 Switching Prisma schema to PostgreSQL..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "✅ Backed up current schema to prisma/schema.prisma.backup"

# Switch provider from sqlite to postgresql
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "✅ Updated schema.prisma to use PostgreSQL"

# Show the change
echo ""
echo "📝 Updated datasource block:"
grep -A 2 "datasource db" prisma/schema.prisma

echo ""
echo "✨ Done! Next steps:"
echo "1. Update your .env.active with Supabase connection string"
echo "2. Run: npx prisma generate"
echo "3. Run: npx prisma db push"
echo "4. Run: npm run db:seed"
echo ""
echo "Need help? Check SUPABASE_SETUP.md"
