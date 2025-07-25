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

    return NextResponse.json({ bankAccount })
  } catch (error) {
    console.error('Get bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, accountType } = await request.json()

    if (!name || !accountType) {
      return NextResponse.json(
        { error: 'Name and account type are required' },
        { status: 400 }
      )
    }

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { userId: user.userId }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'User already has a bank account' },
        { status: 400 }
      )
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: user.userId,
        name,
        accountType
      }
    })

    return NextResponse.json({ bankAccount })
  } catch (error) {
    console.error('Create bank account error:', error)
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
    const { name, accountType } = await request.json()

    if (!name || !accountType) {
      return NextResponse.json(
        { error: 'Name and account type are required' },
        { status: 400 }
      )
    }

    const bankAccount = await prisma.bankAccount.update({
      where: { userId: user.userId },
      data: {
        name,
        accountType
      }
    })

    return NextResponse.json({ bankAccount })
  } catch (error) {
    console.error('Update bank account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}