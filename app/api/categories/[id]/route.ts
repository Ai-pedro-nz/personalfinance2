import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Get user's bank account to filter transactions
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    let affectedTransactions = 0

    if (bankAccount) {
      // Count transactions that will be affected (only for this user's bank account)
      const userTransactions = await prisma.transaction.count({
        where: {
          categoryId: id,
          bankAccountId: bankAccount.id
        }
      })

      // Remove category from user's transactions
      if (userTransactions > 0) {
        const updateResult = await prisma.transaction.updateMany({
          where: {
            categoryId: id,
            bankAccountId: bankAccount.id
          },
          data: {
            categoryId: null
          }
        })
        affectedTransactions = updateResult.count
      }
    }

    // Check if any other users are still using this category
    const remainingTransactions = await prisma.transaction.count({
      where: { categoryId: id }
    })

    let deletedCategory = false
    if (remainingTransactions === 0) {
      // No other users are using this category, safe to delete
      await prisma.category.delete({
        where: { id }
      })
      deletedCategory = true
    }

    const message = deletedCategory
      ? `Category "${category.name}" deleted successfully. Removed from ${affectedTransactions} transactions.`
      : `Category "${category.name}" removed from your ${affectedTransactions} transactions. Category preserved for other users.`

    return NextResponse.json({
      message,
      affectedTransactions,
      deletedCategory
    })

  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}