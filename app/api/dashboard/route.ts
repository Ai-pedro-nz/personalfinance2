import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (!bankAccount) {
      return NextResponse.json({
        totalTransactions: 0,
        currentBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        categoryBreakdown: []
      })
    }

    // Get all transactions for the user
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: bankAccount.id },
      include: { category: true }
    })

    // Calculate summary statistics
    const totalTransactions = transactions.length
    const currentBalance = transactions
      .reduce((sum, t) => sum + t.amount, 0)

    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = Math.abs(transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0))

    // Calculate category breakdown
    const categoryMap = new Map<string, { name: string; color: string; amount: number; count: number }>()
    
    transactions.forEach(transaction => {
      if (transaction.category) {
        const key = transaction.category.id
        const existing = categoryMap.get(key)
        
        if (existing) {
          existing.amount += Math.abs(transaction.amount)
          existing.count += 1
        } else {
          categoryMap.set(key, {
            name: transaction.category.name,
            color: transaction.category.color,
            amount: Math.abs(transaction.amount),
            count: 1
          })
        }
      }
    })

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)

    // Get recent transactions (last 10)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category ? {
          name: t.category.name,
          color: t.category.color
        } : null
      }))

    return NextResponse.json({
      totalTransactions,
      currentBalance,
      totalIncome,
      totalExpenses,
      categoryBreakdown,
      recentTransactions
    })

  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}