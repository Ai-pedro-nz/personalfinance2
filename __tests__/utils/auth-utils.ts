import jwt from 'jsonwebtoken'

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'

export interface MockUser {
  userId: string
  email: string
  name: string
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
})

export const createMockJWT = (user: MockUser): string => {
  return jwt.sign({ userId: user.userId }, TEST_JWT_SECRET, { expiresIn: '7d' })
}

export const createMockRequest = (
  options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    cookies?: Record<string, string>
    body?: any
    user?: MockUser
  } = {}
): any => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    cookies = {},
    body,
    user,
  } = options

  // Get NextRequest from mocked next/server
  const { NextRequest } = require('next/server')

  // Create headers with authentication if user is provided
  const requestHeaders = new (global.Headers || Headers)(headers)
  
  if (user) {
    const token = createMockJWT(user)
    requestHeaders.set('authorization', `Bearer ${token}`)
  }

  // Create cookies
  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
  
  if (cookieString) {
    requestHeaders.set('cookie', cookieString)
  }

  // Create request init
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body)
    requestHeaders.set('content-type', 'application/json')
  }

  return new NextRequest(url, requestInit)
}

export const createAuthenticatedRequest = (
  user: MockUser = createMockUser(),
  options: Omit<Parameters<typeof createMockRequest>[0], 'user'> = {}
): any => {
  return createMockRequest({ ...options, user })
}

export const createUnauthenticatedRequest = (
  options: Omit<Parameters<typeof createMockRequest>[0], 'user'> = {}
): any => {
  return createMockRequest(options)
}

export const mockAuthHelpers = {
  // Mock the auth functions
  getUserFromRequest: jest.fn(),
  verifyToken: jest.fn(),
  signToken: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}

export const setupAuthMocks = () => {
  // Reset all mocks
  Object.values(mockAuthHelpers).forEach(mock => mock.mockReset())

  // Setup default implementations
  mockAuthHelpers.getUserFromRequest.mockImplementation((request: any) => {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as { userId: string }
        return decoded
      } catch {
        return null
      }
    }
    return null
  })

  mockAuthHelpers.verifyToken.mockImplementation((token: string) => {
    try {
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as { userId: string }
      return decoded
    } catch {
      return null
    }
  })

  mockAuthHelpers.signToken.mockImplementation((payload: { userId: string }) => {
    return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '7d' })
  })

  mockAuthHelpers.hashPassword.mockImplementation(async (password: string) => {
    return `hashed_${password}`
  })

  mockAuthHelpers.verifyPassword.mockImplementation(async (password: string, hashed: string) => {
    return hashed === `hashed_${password}`
  })

  return mockAuthHelpers
}

// Jest mock for the auth module
export const mockAuthModule = () => {
  jest.mock('@/lib/auth', () => ({
    getUserFromRequest: mockAuthHelpers.getUserFromRequest,
    verifyToken: mockAuthHelpers.verifyToken,
    signToken: mockAuthHelpers.signToken,
    hashPassword: mockAuthHelpers.hashPassword,
    verifyPassword: mockAuthHelpers.verifyPassword,
    getTokenFromRequest: jest.fn(),
  }))
}

// Placeholder test to satisfy Jest
describe('Auth Utils', () => {
  it('should export utility functions', () => {
    expect(typeof createMockUser).toBe('function')
    expect(typeof createMockJWT).toBe('function')
    expect(typeof createAuthenticatedRequest).toBe('function')
    expect(typeof setupAuthMocks).toBe('function')
  })

  it('should create mock user with default values', () => {
    const user = createMockUser()
    expect(user).toHaveProperty('userId')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('name')
  })
})