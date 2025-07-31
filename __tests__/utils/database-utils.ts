import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

export type MockPrisma = DeepMockProxy<PrismaClient>

// Create a mock Prisma client
export const mockPrisma = mockDeep<PrismaClient>()

// Mock data factories
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed_password',
  name: 'Test User',
  createdAt: new Date(),
  ...overrides,
})

export const createMockBankAccount = (overrides: any = {}) => ({
  id: 'account-1',
  userId: 'user-1',
  name: 'Test Account',
  accountType: 'checking',
  createdAt: new Date(),
  ...overrides,
})

export const createMockCategory = (overrides: any = {}) => ({
  id: 'category-1',
  name: 'Food',
  type: 'expense',
  color: '#8B5CF6',
  ...overrides,
})

export const createMockTransaction = (overrides: any = {}) => ({
  id: 'transaction-1',
  bankAccountId: 'account-1',
  date: new Date(),
  description: 'Test Transaction',
  amount: -25.50,
  categoryId: 'category-1',
  createdAt: new Date(),
  ...overrides,
})

export const createMockLearnedPattern = (overrides: any = {}) => ({
  id: 'pattern-1',
  userId: 'user-1',
  keywords: JSON.stringify(['restaurant', 'food']),
  categoryName: 'Food',
  confidence: 0.85,
  occurrences: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Database test utilities
export const setupDatabaseMocks = () => {
  // Reset all mocks before each test
  mockReset(mockPrisma)

  // Setup default mock implementations
  mockPrisma.user.findUnique.mockResolvedValue(null)
  mockPrisma.user.findMany.mockResolvedValue([])
  mockPrisma.user.create.mockImplementation(async ({ data }) => ({
    ...createMockUser(),
    ...data,
  }))

  mockPrisma.bankAccount.findUnique.mockResolvedValue(null)
  mockPrisma.bankAccount.findMany.mockResolvedValue([])
  mockPrisma.bankAccount.create.mockImplementation(async ({ data }) => ({
    ...createMockBankAccount(),
    ...data,
  }))

  mockPrisma.category.findUnique.mockResolvedValue(null)
  mockPrisma.category.findMany.mockResolvedValue([])
  mockPrisma.category.create.mockImplementation(async ({ data }) => ({
    ...createMockCategory(),
    ...data,
  }))

  mockPrisma.transaction.findUnique.mockResolvedValue(null)
  mockPrisma.transaction.findMany.mockResolvedValue([])
  mockPrisma.transaction.create.mockImplementation(async ({ data }) => ({
    ...createMockTransaction(),
    ...data,
  }))

  mockPrisma.learnedPattern.findMany.mockResolvedValue([])
  mockPrisma.learnedPattern.create.mockImplementation(async ({ data }) => ({
    ...createMockLearnedPattern(),
    ...data,
  }))

  return mockPrisma
}

// Helper to mock a user with related data
export const mockUserWithData = (user = createMockUser()) => {
  const bankAccount = createMockBankAccount({ userId: user.id })
  const categories = [
    createMockCategory({ id: 'cat-1', name: 'Food' }),
    createMockCategory({ id: 'cat-2', name: 'Transportation' }),
  ]
  const transactions = [
    createMockTransaction({ 
      id: 'trans-1', 
      bankAccountId: bankAccount.id, 
      categoryId: categories[0].id,
      category: categories[0] 
    }),
    createMockTransaction({ 
      id: 'trans-2', 
      bankAccountId: bankAccount.id, 
      categoryId: categories[1].id,
      category: categories[1] 
    }),
  ]

  mockPrisma.user.findUnique.mockResolvedValue(user)
  mockPrisma.bankAccount.findUnique.mockResolvedValue({
    ...bankAccount,
    user,
    transactions,
  })
  mockPrisma.category.findMany.mockResolvedValue(categories)
  mockPrisma.transaction.findMany.mockResolvedValue(
    transactions.map(t => ({ ...t, bankAccount, category: categories.find(c => c.id === t.categoryId) || null }))
  )

  return { user, bankAccount, categories, transactions }
}

// Mock database operations for specific scenarios
export const mockDatabaseScenarios = {
  // User authentication scenarios
  userExists: (user = createMockUser()) => {
    mockPrisma.user.findUnique.mockResolvedValue(user)
    return user
  },

  userNotFound: () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
  },

  // Bank account scenarios
  userHasBankAccount: (user = createMockUser()) => {
    const bankAccount = createMockBankAccount({ userId: user.id })
    mockPrisma.bankAccount.findUnique.mockResolvedValue({
      ...bankAccount,
      user,
      transactions: [],
    })
    return bankAccount
  },

  userHasNoBankAccount: () => {
    mockPrisma.bankAccount.findUnique.mockResolvedValue(null)
  },

  // Transaction scenarios
  userHasTransactions: (count = 3) => {
    const transactions = Array.from({ length: count }, (_, i) =>
      createMockTransaction({ 
        id: `trans-${i + 1}`,
        amount: i % 2 === 0 ? -25.50 : 100.00, // Mix of expenses and income
      })
    )
    mockPrisma.transaction.findMany.mockResolvedValue(transactions)
    return transactions
  },

  userHasNoTransactions: () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])
  },

  // Category scenarios
  categoriesExist: (categories = [createMockCategory()]) => {
    mockPrisma.category.findMany.mockResolvedValue(categories)
    return categories
  },

  // Database errors
  databaseError: (operation: keyof PrismaClient, error = new Error('Database connection failed')) => {
    (mockPrisma[operation] as any).mockRejectedValue(error)
  },
}

// Jest mock for the Prisma module
export const mockPrismaModule = () => {
  jest.mock('@/lib/prisma', () => ({
    prisma: mockPrisma,
  }))
}

// Helper to create test database cleanup
export const createTestDatabaseCleanup = () => {
  return async () => {
    // In a real test environment, you might want to clean up a test database
    // For now, we just reset the mocks
    mockReset(mockPrisma)
  }
}

// Placeholder test to satisfy Jest
describe('Database Utils', () => {
  it('should export utility functions', () => {
    expect(typeof setupDatabaseMocks).toBe('function')
    expect(typeof createMockUser).toBe('function')
    expect(typeof mockDatabaseScenarios.userExists).toBe('function')
  })
})