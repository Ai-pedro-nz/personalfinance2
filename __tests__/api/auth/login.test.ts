import { POST } from '@/app/api/auth/login/route'
import { setupAuthMocks, createUnauthenticatedRequest, createMockUser } from '../../utils/auth-utils'
import { setupDatabaseMocks, mockDatabaseScenarios } from '../../utils/database-utils'

// Mock modules
jest.mock('@/lib/auth', () => ({
  getUserFromRequest: jest.fn(),
  verifyToken: jest.fn(),
  signToken: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    }
  }
}))

describe('/api/auth/login', () => {
  const mockAuth = require('@/lib/auth')
  const mockPrisma = require('@/lib/prisma')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = createMockUser({
        email: 'test@example.com',
        password: 'hashed_password123',
      })

      // Mock database and auth responses
      mockPrisma.prisma.user.findUnique.mockResolvedValue(mockUser)
      mockAuth.verifyPassword.mockResolvedValue(true)
      mockAuth.signToken.mockReturnValue('mock-jwt-token')

      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Login successful',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      })

      // Check that password was verified
      expect(mockAuth.verifyPassword).toHaveBeenCalledWith('password123', mockUser.password)
      expect(mockAuth.signToken).toHaveBeenCalledWith({ userId: mockUser.id })

      // Response should be successful
      expect(response.status).toBe(200)
    })

    it('should reject login with invalid email', async () => {
      mockPrisma.prisma.user.findUnique.mockResolvedValue(null)

      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Invalid credentials' })
      expect(mockAuth.verifyPassword).not.toHaveBeenCalled()
    })

    it('should reject login with invalid password', async () => {
      const mockUser = createMockUser()
      mockPrisma.prisma.user.findUnique.mockResolvedValue(mockUser)
      mockAuth.verifyPassword.mockResolvedValue(false)

      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          email: mockUser.email,
          password: 'wrongpassword',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Invalid credentials' })
      expect(mockAuth.verifyPassword).toHaveBeenCalledWith('wrongpassword', mockUser.password)
    })

    it('should reject login with missing email', async () => {
      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Email and password are required' })
    })

    it('should reject login with missing password', async () => {
      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          email: 'test@example.com',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Email and password are required' })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.prisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = createUnauthenticatedRequest({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should handle invalid JSON body', async () => {
      // Create a mock request that will throw JSON parsing error
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token i in JSON')),
        headers: { get: jest.fn() },
        cookies: { get: jest.fn() }
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
})