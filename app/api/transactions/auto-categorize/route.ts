import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { categorizeTransaction, categorizeTransactionBase } from '@/lib/auto-categorizer'
import { hybridCategorize } from '@/lib/ml-trainer'

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'No bank account found' },
        { status: 400 }
      )
    }

    // Get all categories
    const categories = await prisma.category.findMany()
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]))

    // For now, just use empty learned patterns (fall back to base rules)
    const learnedPatterns: any[] = []

    // Get uncategorized transactions
    const uncategorizedTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: bankAccount.id,
        categoryId: null
      }
    })

    let categorizedCount = 0
    const updates: Array<{ id: string, categoryId: string }> = []

    // Process each uncategorized transaction using hybrid approach
    for (const transaction of uncategorizedTransactions) {
      const suggestedCategory = learnedPatterns.length > 0
        ? hybridCategorize(
            transaction.description,
            transaction.amount,
            learnedPatterns,
            categorizeTransactionBase
          )
        : categorizeTransaction(transaction.description, transaction.amount)
      
      if (suggestedCategory && categoryMap.has(suggestedCategory)) {
        const categoryId = categoryMap.get(suggestedCategory)!
        updates.push({ id: transaction.id, categoryId })
        categorizedCount++
      }
    }

    // Apply updates in batch
    if (updates.length > 0) {
      await Promise.all(
        updates.map(update =>
          prisma.transaction.update({
            where: { id: update.id },
            data: { categoryId: update.categoryId }
          })
        )
      )
    }

    return NextResponse.json({
      message: `Successfully auto-categorized ${categorizedCount} transactions`,
      categorizedCount,
      totalUncategorized: uncategorizedTransactions.length,
      remainingUncategorized: uncategorizedTransactions.length - categorizedCount
    })

  } catch (error) {
    console.error('Auto-categorization error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-categorize transactions' },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what would be categorized
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'No bank account found' },
        { status: 400 }
      )
    }

    // For now, just use empty learned patterns (fall back to base rules)
    const learnedPatterns: any[] = []

    // Get uncategorized transactions
    const uncategorizedTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: bankAccount.id,
        categoryId: null
      },
      take: 20 // Limit preview to 20 transactions
    })

    const preview = uncategorizedTransactions.map(transaction => {
      const suggestedCategory = learnedPatterns.length > 0
        ? hybridCategorize(
            transaction.description,
            transaction.amount,
            learnedPatterns,
            categorizeTransactionBase
          )
        : categorizeTransaction(transaction.description, transaction.amount)
      return {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        suggestedCategory: suggestedCategory || 'No suggestion'
      }
    })

    const totalUncategorized = await prisma.transaction.count({
      where: {
        bankAccountId: bankAccount.id,
        categoryId: null
      }
    })

    const wouldBeCategorized = preview.filter(p => p.suggestedCategory !== 'No suggestion').length

    return NextResponse.json({
      preview,
      totalUncategorized,
      wouldBeCategorized,
      previewCount: preview.length
    })

  } catch (error) {
    console.error('Auto-categorization preview error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}