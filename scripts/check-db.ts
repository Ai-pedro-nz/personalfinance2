#!/usr/bin/env tsx

/**
 * Database Health Check Script
 * Verifies Supabase database connection and setup
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('🔍 Checking Supabase database connection...')
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check if tables exist by counting records
    const userCount = await prisma.user.count()
    console.log(`✅ Users table accessible (${userCount} records)`)
    
    const categoryCount = await prisma.category.count()
    console.log(`✅ Categories table accessible (${categoryCount} records)`)
    
    const transactionCount = await prisma.transaction.count()
    console.log(`✅ Transactions table accessible (${transactionCount} records)`)
    
    const bankAccountCount = await prisma.bankAccount.count()
    console.log(`✅ Bank accounts table accessible (${bankAccountCount} records)`)
    
    const learnedPatternCount = await prisma.learnedPattern.count()
    console.log(`✅ Learned patterns table accessible (${learnedPatternCount} records)`)
    
    // Test a simple query
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        bankAccount: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    })
    
    console.log(`✅ Query test successful (${recentTransactions.length} recent transactions)`)
    
    // Check database info
    const result = await prisma.$queryRaw`SELECT version();` as any[]
    if (result && result[0]) {
      console.log(`✅ Database version: ${result[0].version}`)
    }
    
    console.log('\n🎉 Supabase database is running and accessible!')
    
    if (categoryCount === 0) {
      console.log('\n⚠️  No categories found. Consider running: npm run db:seed')
    }
    
    if (userCount === 0) {
      console.log('⚠️  No users found. You may need to create test users for E2E tests.')
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        console.error('💡 Check your DATABASE_URL in .env file')
        console.error('💡 Ensure Supabase project is running and accessible')
      }
      
      if (error.message.includes('does not exist')) {
        console.error('💡 Database tables may not be created. Try: npx prisma db push')
      }
      
      if (error.message.includes('authentication')) {
        console.error('💡 Check database credentials in DATABASE_URL')
      }
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkDatabase()
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })