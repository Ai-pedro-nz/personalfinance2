#!/usr/bin/env tsx

/**
 * Direct Supabase Connection Test
 * Tests if requests are actually reaching Supabase
 */

import { PrismaClient } from '@prisma/client'

async function testSupabaseConnection() {
  console.log('🔍 Testing direct Supabase connection...\n')
  
  // Parse DATABASE_URL to show connection details
  const dbUrl = process.env.DATABASE_URL!
  console.log('DATABASE_URL details:')
  
  try {
    const url = new URL(dbUrl)
    console.log(`  Host: ${url.hostname}`)
    console.log(`  Port: ${url.port}`)
    console.log(`  Database: ${url.pathname.slice(1)}`)
    console.log(`  Username: ${url.username}`)
    console.log(`  Password: ${'*'.repeat(url.password.length)}`)
    console.log(`  Search params: ${url.search}`)
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error)
    return
  }
  
  console.log('\n📊 Testing database operations...')
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })
  
  try {
    console.log('\n1. Testing basic connection...')
    await prisma.$connect()
    console.log('✅ Connection established')
    
    console.log('\n2. Testing simple query...')
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version;`
    console.log('✅ Query successful:', result)
    
    console.log('\n3. Testing user table access...')
    const userCount = await prisma.user.count()
    console.log(`✅ User count: ${userCount}`)
    
    console.log('\n4. Testing user creation (to verify write access)...')
    const testEmail = `test-${Date.now()}@example.com`
    
    try {
      const newUser = await prisma.user.create({
        data: {
          email: testEmail,
          password: 'test-hash',
          name: 'Test User'
        }
      })
      console.log(`✅ User created successfully: ${newUser.id}`)
      
      // Clean up test user
      await prisma.user.delete({ where: { id: newUser.id } })
      console.log(`✅ Test user cleaned up`)
      
    } catch (createError) {
      console.error('❌ User creation failed:', createError)
    }
    
    console.log('\n5. Testing categories table...')
    const categoryCount = await prisma.category.count()
    console.log(`✅ Category count: ${categoryCount}`)
    
    if (categoryCount === 0) {
      console.log('\n6. Creating test category...')
      try {
        const category = await prisma.category.create({
          data: {
            name: 'Test Category',
            type: 'expense',
            color: '#ff0000'
          }
        })
        console.log(`✅ Test category created: ${category.id}`)
        
        // Clean up
        await prisma.category.delete({ where: { id: category.id } })
        console.log(`✅ Test category cleaned up`)
      } catch (categoryError) {
        console.error('❌ Category creation failed:', categoryError)
      }
    }
    
    console.log('\n7. Testing complex query with joins...')
    const recentData = await prisma.user.findMany({
      take: 3,
      include: {
        bankAccount: {
          include: {
            transactions: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    })
    console.log(`✅ Complex query successful: ${recentData.length} users with bank accounts`)
    
    console.log('\n🎉 All Supabase tests passed! Database is fully accessible.')
    
  } catch (error) {
    console.error('\n❌ Supabase connection test failed:', error)
    
    if (error instanceof Error) {
      console.error('\nError details:')
      console.error(`  Name: ${error.name}`)
      console.error(`  Message: ${error.message}`)
      
      if (error.message.includes('prepared statement')) {
        console.error('\n💡 This is the prepared statement issue - connection pooling problem')
      }
      
      if (error.message.includes('connect')) {
        console.error('\n💡 Connection issue - check if Supabase project is active')
      }
      
      if (error.message.includes('auth')) {
        console.error('\n💡 Authentication issue - check DATABASE_URL credentials')
      }
    }
    
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Database connection closed')
  }
}

// Run the test
testSupabaseConnection()
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })