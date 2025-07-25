import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { parseISPBankCSV } from '@/lib/csv-parser'

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
        { error: 'No bank account found. Please add a bank account first.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('csvFile') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please upload a CSV file' },
        { status: 400 }
      )
    }

    const csvContent = await file.text()
    const transactions = parseISPBankCSV(csvContent)

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions found in CSV file' },
        { status: 400 }
      )
    }

    // Check for existing transactions to avoid duplicates
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId: bankAccount.id,
        date: {
          in: transactions.map(t => new Date(t.date))
        }
      }
    })

    const existingKeys = new Set(
      existingTransactions.map(t => 
        `${t.date.getTime()}_${t.description}_${t.amount}`
      )
    )

    const newTransactions = transactions.filter(t => {
      const key = `${new Date(t.date).getTime()}_${t.description}_${t.amount}`
      return !existingKeys.has(key)
    })

    if (newTransactions.length === 0) {
      return NextResponse.json({
        message: 'All transactions already exist in the database',
        imported: 0,
        total: transactions.length
      })
    }

    // Create new transactions
    const createdTransactions = await prisma.transaction.createMany({
      data: newTransactions.map(t => ({
        bankAccountId: bankAccount.id,
        date: new Date(t.date),
        description: t.description,
        amount: t.amount
      }))
    })

    return NextResponse.json({
      message: 'Transactions imported successfully',
      imported: createdTransactions.count,
      total: transactions.length,
      skipped: transactions.length - createdTransactions.count
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}