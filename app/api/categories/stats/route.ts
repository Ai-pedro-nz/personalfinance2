import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's bank account to filter transactions
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (!bankAccount) {
      // Return all categories with 0 counts if no bank account
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      })
      
      const categoriesWithCounts = categories.map(category => ({
        ...category,
        _count: { transactions: 0 }
      }))

      return NextResponse.json({ categories: categoriesWithCounts })
    }

    // Get categories with transaction counts for this user's bank account
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            transactions: {
              where: {
                bankAccountId: bankAccount.id
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ categories })

  } catch (error) {
    console.error('Category stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}