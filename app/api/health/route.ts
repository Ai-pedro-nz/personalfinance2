import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Test a simple query
    const userCount = await prisma.user.count()
    const categoryCount = await prisma.category.count()
    
    // Test database version
    const result = await prisma.$queryRaw`SELECT version();` as any[]
    const dbVersion = result[0]?.version || 'Unknown'
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        userCount,
        categoryCount,
        version: dbVersion.substring(0, 100) // Truncate long version string
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}