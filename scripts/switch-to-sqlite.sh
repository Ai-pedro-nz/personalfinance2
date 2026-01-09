#!/bin/bash

# Script to switch Prisma schema from PostgreSQL back to SQLite
# Run this if you want to go back to local SQLite development

echo "🔄 Switching Prisma schema to SQLite..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "✅ Backed up current schema to prisma/schema.prisma.backup"

# Switch provider from postgresql to sqlite
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

echo "✅ Updated schema.prisma to use SQLite"

# Show the change
echo ""
echo "📝 Updated datasource block:"
grep -A 2 "datasource db" prisma/schema.prisma

echo ""
echo "✨ Done! Next steps:"
echo "1. Update your .env.active to: DATABASE_URL=\"file:./dev.db\""
echo "2. Run: npx prisma generate"
echo "3. Run: npx prisma db push"
echo "4. Run: npm run db:seed"
echo ""
echo "Your local SQLite database is at: prisma/dev.db"
