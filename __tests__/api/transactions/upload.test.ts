import { POST } from '@/app/api/transactions/upload/route'
import { setupAuthMocks, createAuthenticatedRequest, createUnauthenticatedRequest, createMockUser } from '../../utils/auth-utils'
import { setupDatabaseMocks, mockDatabaseScenarios } from '../../utils/database-utils'
import { csvTestData, mockFileUpload, csvAssertions, createMockCSVFile } from '../../utils/csv-utils'

// Mock modules
jest.mock('@/lib/auth', () => ({
  getUserFromRequest: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    bankAccount: {
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    }
  }
}))

jest.mock('@/lib/csv-parser', () => ({
  parseCSV: jest.fn(),
  parseISPBankCSV: jest.fn(),
}))

jest.mock('@/lib/auto-categorizer', () => ({
  categorizeTransaction: jest.fn(),
}))

describe('/api/transactions/upload', () => {
  const mockAuth = require('@/lib/auth')
  const mockPrisma = require('@/lib/prisma')
  const mockCSVParser = require('@/lib/csv-parser')
  const mockCategorizer = require('@/lib/auto-categorizer')
  const mockUser = createMockUser()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default auth mock
    mockAuth.getUserFromRequest.mockReturnValue(mockUser)
    
    // Setup default categorizer
    mockCategorizer.categorizeTransaction.mockReturnValue('Food')
  })

  describe('POST /api/transactions/upload', () => {
    it('should upload and process CSV file successfully', async () => {
      const mockBankAccount = { id: 'account-1', userId: mockUser.userId }
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(mockBankAccount)
      
      // Mock no existing transactions (empty array)
      mockPrisma.prisma.transaction.findMany.mockResolvedValue([])
      
      // Mock successful creation
      mockPrisma.prisma.transaction.createMany.mockResolvedValue({ count: 3 })
      
      const transactions = csvTestData.standard
      
      // Mock CSV parsing
      mockCSVParser.parseISPBankCSV.mockReturnValue(
        transactions.map(t => ({
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
        }))
      )

      // Create request with file
      const mockFile = createMockCSVFile(transactions)
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })
      
      // Mock the file property on request
      Object.defineProperty(request, 'file', {
        value: mockFile,
        writable: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Transactions imported successfully')
      expect(data.imported).toBe(transactions.length)
      expect(data.total).toBe(transactions.length)

      // Verify CSV was parsed with CSV content
      expect(mockCSVParser.parseISPBankCSV).toHaveBeenCalled()
    })

    it('should reject upload from unauthenticated user', async () => {
      // Override auth mock to return null (unauthenticated)
      mockAuth.getUserFromRequest.mockReturnValue(null)
      
      const request = createUnauthenticatedRequest({
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should reject upload when user has no bank account', async () => {
      // Mock no bank account found
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(null)

      const mockFile = createMockCSVFile(csvTestData.standard)
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })
      
      Object.defineProperty(request, 'file', {
        value: mockFile,
        writable: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'No bank account found. Please add a bank account first.' })
    })

    it('should handle CSV parsing errors', async () => {
      // First setup bank account so we get past that check
      const mockBankAccount = { id: 'account-1', userId: mockUser.userId }
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(mockBankAccount)
      
      // Then mock CSV parsing error
      mockCSVParser.parseISPBankCSV.mockImplementation(() => {
        throw new Error('Invalid CSV format')
      })

      const mockFile = createMockCSVFile(csvTestData.standard)
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })
      
      Object.defineProperty(request, 'file', {
        value: mockFile,
        writable: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to process CSV file')
    })

    it('should handle missing file', async () => {
      // Setup bank account so we get past that check
      const mockBankAccount = { id: 'account-1', userId: mockUser.userId }
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(mockBankAccount)
      
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'No file provided' })
    })

    it('should categorize transactions during upload', async () => {
      // Setup bank account
      const mockBankAccount = { id: 'account-1', userId: mockUser.userId }
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(mockBankAccount)
      
      // Mock no existing transactions
      mockPrisma.prisma.transaction.findMany.mockResolvedValue([])
      mockPrisma.prisma.transaction.createMany.mockResolvedValue({ count: 3 })
      
      const transactions = csvTestData.standard
      
      // Mock CSV parsing
      mockCSVParser.parseISPBankCSV.mockReturnValue(
        transactions.map(t => ({
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
        }))
      )

      // Mock categorization
      mockCategorizer.categorizeTransaction.mockImplementation((desc: string, amount: number) => {
        if (desc.includes('McDonald')) return 'Food'
        if (desc.includes('Salary')) return 'Income'
        if (desc.includes('Supermarket')) return 'Shopping'
        return null
      })

      const mockFile = createMockCSVFile(transactions)
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })
      
      Object.defineProperty(request, 'file', {
        value: mockFile,
        writable: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.imported).toBe(transactions.length)
      expect(data.total).toBe(transactions.length)
    })

    it('should handle partial failures during import', async () => {
      // Setup bank account
      const mockBankAccount = { id: 'account-1', userId: mockUser.userId }
      mockPrisma.prisma.bankAccount.findUnique.mockResolvedValue(mockBankAccount)
      
      // Mock no existing transactions
      mockPrisma.prisma.transaction.findMany.mockResolvedValue([])
      mockPrisma.prisma.transaction.createMany.mockResolvedValue({ count: 2 })
      
      // Mock CSV parsing with valid data
      mockCSVParser.parseISPBankCSV.mockReturnValue([
        { date: new Date('2024-01-15'), description: 'Valid Transaction', amount: -25.50 },
        { date: new Date('2024-01-17'), description: 'Another Valid', amount: -15.99 },
      ])

      const mockFile = createMockCSVFile(csvTestData.standard)
      const request = createAuthenticatedRequest(mockUser, {
        method: 'POST',
      })
      
      Object.defineProperty(request, 'file', {
        value: mockFile,
        writable: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.imported).toBe(2)
      expect(data.total).toBe(2)
    })
  })
})