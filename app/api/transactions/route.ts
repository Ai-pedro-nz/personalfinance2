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
      return NextResponse.json({ transactions: [] })
    }

    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: bankAccount.id },
      include: { category: true },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { transactionId, categoryId } = await request.json()

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Verify the transaction belongs to the user's bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (!bankAccount) {
      return NextResponse.json({ error: 'No bank account found' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        bankAccountId: bankAccount.id
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { categoryId: categoryId || null },
      include: { category: true }
    })

    console.log(`Manual categorization: Transaction ${transactionId} categorized as ${updatedTransaction.category?.name || 'uncategorized'}`)

    return NextResponse.json({ transaction: updatedTransaction })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}