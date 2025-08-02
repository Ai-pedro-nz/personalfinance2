const { execSync } = require('child_process');

async function migrate() {
  try {
    console.log('🔄 Running Prisma database migration...');
    
    // First generate the Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Then push the schema to the database
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();