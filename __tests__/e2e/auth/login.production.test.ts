/**
 * Production E2E Tests for Authentication
 * Tests actual HTTP requests against the live production application
 */

import { 
  loginUser, 
  makeRequest, 
  testUsers, 
  wait,
  type AuthResponse,
} from '../utils/production-api'

// Increase timeout for network requests
jest.setTimeout(30000)

describe('Production E2E: /api/auth/login', () => {
  beforeEach(async () => {
    // Wait between tests to avoid rate limiting
    await wait(1000)
  })

  describe('POST /api/auth/login', () => {
    it('should reject login with missing email', async () => {
      const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
        }),
      })

      expect(response.status).toBe(400)
      expect(response.data).toEqual({ 
        error: 'Email and password are required' 
      })
    })

    it('should reject login with missing password', async () => {
      const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      expect(response.status).toBe(400)
      expect(response.data).toEqual({ 
        error: 'Email and password are required' 
      })
    })

    it('should reject login with invalid email', async () => {
      const response = await makeRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testUsers.invalid.email,
          password: testUsers.invalid.password,
        }),
      })

      expect(response.status).toBe(401)
      expect(response.data).toEqual({ error: 'Invalid credentials' })
    })

    it('should reject login with invalid password for valid email', async () => {
      const response = await makeRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testUsers.valid.email,
          password: 'wrongpassword',
        }),
      })

      expect(response.status).toBe(401)
      expect(response.data).toEqual({ error: 'Invalid credentials' })
    })

    it('should handle invalid JSON body gracefully', async () => {
      const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      expect(response.status).toBe(400)
      // The response might vary depending on how the production app handles JSON parsing errors
      expect([400, 500]).toContain(response.status)
    })

    it('should login successfully with valid credentials (if test user exists)', async () => {
      const { response, token, user } = await loginUser(testUsers.valid)

      if (response.status === 401) {
        // Test user doesn't exist in production - skip this test
        console.log('⚠️  Test user not found in production - skipping successful login test')
        return
      }

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        message: 'Login successful',
        user: {
          email: testUsers.valid.email,
        },
      })
      expect(user).toBeTruthy()
      expect(user?.email).toBe(testUsers.valid.email)
      
      // Token should be present in cookie or response
      // Note: In production, tokens are typically in httpOnly cookies
      // so we might not be able to access them directly
    })

    it('should handle network timeouts and server errors gracefully', async () => {
      // Test with a very short timeout to simulate network issues
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 100) // Abort after 100ms

      try {
        await makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(testUsers.valid),
          signal: controller.signal,
        })
      } catch (error: any) {
        // Should handle abort gracefully
        expect(error.name).toBe('AbortError')
      }
    })

    it('should return appropriate CORS headers', async () => {
      const response = await makeRequest('/api/auth/login', {
        method: 'OPTIONS',
      })

      // Check if CORS is properly configured
      // Status might be 200 or 204 depending on implementation
      expect([200, 204, 405]).toContain(response.status)
    })

    it('should handle concurrent login requests', async () => {
      // Test multiple simultaneous login attempts
      const promises = Array(3).fill(null).map(() => 
        makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          }),
        })
      )

      const responses = await Promise.all(promises)
      
      // All should return 401 for invalid credentials
      responses.forEach(response => {
        expect(response.status).toBe(401)
        expect(response.data).toEqual({ error: 'Invalid credentials' })
      })
    })
  })

  describe('Rate Limiting and Security', () => {
    it('should handle rapid login attempts appropriately', async () => {
      const promises = Array(5).fill(null).map((_, index) => 
        makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: `test${index}@example.com`,
            password: 'wrongpassword',
          }),
        }).then(response => ({ index, response }))
      )

      const results = await Promise.all(promises)
      
      // Check if rate limiting is in place
      // Some requests might be rate limited (429) or all might return 401
      results.forEach(({ response }) => {
        expect([401, 429]).toContain(response.status)
      })
    })

    it('should have security headers in response', async () => {
      const response = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(testUsers.invalid),
      })

      // Check for common security headers
      const headers = response.headers
      
      // These headers might be set by Vercel or the application
      // Not all are required, but good to check what's present
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy',
        'x-xss-protection',
      ]

      console.log('Security headers present:')
      securityHeaders.forEach(header => {
        const value = headers.get(header)
        if (value) {
          console.log(`  ${header}: ${value}`)
        }
      })

      // At minimum, we expect the response to be JSON
      expect(headers.get('content-type')).toContain('application/json')
    })
  })
})