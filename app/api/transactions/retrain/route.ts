import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { trainFromUserData, hybridCategorize } from '@/lib/ml-trainer'
import { categorizeTransactionBase } from '@/lib/auto-categorizer'

export async function POST(request: NextRequest) {
  console.log('Retrain API called')
  
  const user = getUserFromRequest(request)
  console.log('User from request:', user ? 'Found' : 'Not found')
  
  if (!user) {
    console.log('Authentication failed')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Looking for bank account for user:', user.userId)
    
    // Get user's bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    console.log('Bank account found:', bankAccount ? 'Yes' : 'No')

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'No bank account found' },
        { status: 400 }
      )
    }

    // Get all categorized transactions for training
    const categorizedTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: bankAccount.id,
        categoryId: { not: null }
      },
      include: { category: true }
    })

    console.log('Found categorized transactions:', categorizedTransactions.length)

    if (categorizedTransactions.length < 5) {
      console.log('Not enough categorized transactions')
      return NextResponse.json(
        { error: `Need at least 5 categorized transactions to retrain. Found ${categorizedTransactions.length}.` },
        { status: 400 }
      )
    }

    // Prepare training data
    const trainingData = categorizedTransactions.map(t => ({
      description: t.description,
      amount: t.amount,
      categoryName: t.category!.name
    }))

    console.log('Training data prepared:', trainingData.length, 'examples')

    // Train the model
    const learnedPatterns = trainFromUserData(trainingData)
    console.log('Learned patterns generated:', learnedPatterns.length)

    // For now, skip saving patterns to database and just use them directly
    console.log('Skipping pattern storage, using patterns directly for this session')

    // Now apply the retrained model to uncategorized transactions
    const uncategorizedTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: bankAccount.id,
        categoryId: null
      }
    })

    // Get all categories for mapping
    const categories = await prisma.category.findMany()
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]))

    let categorizedCount = 0
    const updates: Array<{ id: string, categoryId: string }> = []

    // Process each uncategorized transaction with the retrained model
    for (const transaction of uncategorizedTransactions) {
      const suggestedCategory = hybridCategorize(
        transaction.description,
        transaction.amount,
        learnedPatterns,
        categorizeTransactionBase
      )
      
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
      message: `AI retrained successfully! Auto-categorized ${categorizedCount} transactions using your preferences.`,
      trainingDataCount: trainingData.length,
      learnedPatternsCount: learnedPatterns.length,
      categorizedCount,
      totalUncategorized: uncategorizedTransactions.length,
      remainingUncategorized: uncategorizedTransactions.length - categorizedCount
    })

  } catch (error) {
    console.error('Retrain error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to retrain AI model',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check training readiness
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

    // Count categorized and uncategorized transactions
    const [categorizedCount, uncategorizedCount] = await Promise.all([
      prisma.transaction.count({
        where: {
          bankAccountId: bankAccount.id,
          categoryId: { not: null }
        }
      }),
      prisma.transaction.count({
        where: {
          bankAccountId: bankAccount.id,
          categoryId: null
        }
      })
    ])

    // For now, set learned patterns count to 0
    const learnedPatternsCount = 0

    const canRetrain = categorizedCount >= 5
    const lastRetrained = learnedPatternsCount > 0 ? new Date() : null // Simplified for demo

    return NextResponse.json({
      canRetrain,
      categorizedCount,
      uncategorizedCount,
      learnedPatternsCount,
      minimumRequired: 5,
      lastRetrained
    })

  } catch (error) {
    console.error('Training status error:', error)
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    )
  }
}