/**
 * Production E2E Test Utilities
 * Makes actual HTTP requests to the production application
 */

const BASE_URL = process.env.BASE_URL || 'https://personalfinance-mauve.vercel.app'

export interface ProductionTestUser {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  message: string
  user: {
    id: string
    name: string
    email: string
  }
}

export interface ApiResponse<T = any> {
  status: number
  data: T
  headers: Headers
}

/**
 * Make HTTP request to production API
 */
export async function makeRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  let data: T
  try {
    data = await response.json()
  } catch {
    // Handle non-JSON responses
    data = await response.text() as unknown as T
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  }
}

/**
 * Login to production application and return auth token
 */
export async function loginUser(credentials: ProductionTestUser): Promise<{
  token: string | null
  user: AuthResponse['user'] | null
  response: ApiResponse<AuthResponse>
}> {
  const response = await makeRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  })

  // Extract token from Set-Cookie header if present
  const setCookieHeader = response.headers.get('set-cookie')
  let token: string | null = null
  
  if (setCookieHeader) {
    const tokenMatch = setCookieHeader.match(/token=([^;]+)/)
    token = tokenMatch ? tokenMatch[1] : null
  }

  return {
    token,
    user: response.status === 200 ? response.data.user : null,
    response,
  }
}

/**
 * Make authenticated request to production API
 */
export async function makeAuthenticatedRequest<T = any>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return makeRequest<T>(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`,
      ...options.headers,
    },
  })
}

/**
 * Upload CSV file to production API
 */
export async function uploadCSVFile(
  token: string,
  csvContent: string,
  filename: string = 'test-transactions.csv'
): Promise<ApiResponse> {
  const formData = new FormData()
  const blob = new Blob([csvContent], { type: 'text/csv' })
  formData.append('file', blob, filename)

  const response = await fetch(`${BASE_URL}/api/transactions/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': `token=${token}`,
    },
    body: formData,
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = await response.text()
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  }
}

/**
 * Test user credentials for production testing
 * Note: These should be test accounts in production
 */
export const testUsers = {
  valid: {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User',
  },
  invalid: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  },
} as const

/**
 * Sample CSV data for production testing
 */
export const productionCSVData = {
  standard: `Date,Description,Amount
2024-01-15,McDonald's Restaurant,-12.50
2024-01-14,Salary Deposit,2500.00
2024-01-13,Supermarket Shopping,-85.99`,
  
  invalid: `Invalid,CSV,Format
Not,A,Valid,Transaction`,
  
  empty: `Date,Description,Amount`,
} as const

/**
 * Wait for a specified time (useful for rate limiting)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Clean up test data (if cleanup endpoints exist)
 */
export async function cleanupTestData(token: string): Promise<void> {
  // This would call cleanup endpoints if they exist
  // For now, it's a placeholder
  console.log('Cleanup test data (not implemented)')
}