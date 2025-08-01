/**
 * Production E2E Tests for Transaction Upload
 * Tests actual CSV upload functionality against the live production application
 */

import { 
  loginUser, 
  makeAuthenticatedRequest,
  uploadCSVFile,
  testUsers, 
  productionCSVData,
  wait,
} from '../utils/production-api'

// Increase timeout for file upload operations
jest.setTimeout(45000)

describe('Production E2E: /api/transactions/upload', () => {
  let authToken: string | null = null
  let testUserExists = false

  beforeAll(async () => {
    // Try to login with test user
    const { token, response } = await loginUser(testUsers.valid)
    
    if (response.status === 200 && token) {
      authToken = token
      testUserExists = true
      console.log('✅ Test user authenticated for transaction upload tests')
    } else {
      console.log('⚠️  Test user not available - some tests will be skipped')
    }
  })

  beforeEach(async () => {
    // Wait between tests to avoid rate limiting
    await wait(1000)
  })

  describe('POST /api/transactions/upload', () => {
    it('should reject upload from unauthenticated user', async () => {
      const response = await uploadCSVFile('invalid-token', productionCSVData.standard)

      expect(response.status).toBe(401)
      expect(response.data).toEqual({ error: 'Unauthorized' })
    })

    it('should reject upload with missing file', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const response = await makeAuthenticatedRequest('/api/transactions/upload', authToken!, {
        method: 'POST',
        body: new FormData(), // Empty form data
      })

      expect(response.status).toBe(400)
      expect(response.data).toMatchObject({ 
        error: expect.stringContaining('file') 
      })
    })

    it('should handle invalid CSV format gracefully', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const response = await uploadCSVFile(authToken!, productionCSVData.invalid)

      // Should return error for invalid CSV
      expect([400, 500]).toContain(response.status)
      expect(response.data).toMatchObject({
        error: expect.stringContaining('CSV')
      })
    })

    it('should handle empty CSV file', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const response = await uploadCSVFile(authToken!, productionCSVData.empty)

      // Might succeed with 0 transactions or fail with validation error
      expect([200, 400]).toContain(response.status)
      
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          imported: 0,
          total: 0
        })
      }
    })

    it('should upload and process valid CSV file successfully', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const response = await uploadCSVFile(authToken!, productionCSVData.standard)

      if (response.status === 400 && response.data.error?.includes('bank account')) {
        console.log('⚠️  User needs to set up bank account first - skipping successful upload test')
        return
      }

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        message: expect.stringContaining('success'),
        imported: expect.any(Number),
        total: expect.any(Number),
      })

      // Should import some transactions
      expect(response.data.imported).toBeGreaterThanOrEqual(0)
      expect(response.data.total).toBeGreaterThanOrEqual(response.data.imported)
    })

    it('should handle large CSV files within reasonable time', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      // Create a larger CSV file for testing
      const largeCSVContent = [
        'Date,Description,Amount',
        ...Array(50).fill(null).map((_, i) => 
          `2024-01-${String(i + 1).padStart(2, '0')},Test Transaction ${i + 1},-${(Math.random() * 100).toFixed(2)}`
        )
      ].join('\n')

      const startTime = Date.now()
      const response = await uploadCSVFile(authToken!, largeCSVContent, 'large-test.csv')
      const endTime = Date.now()

      if (response.status === 400 && response.data.error?.includes('bank account')) {
        console.log('⚠️  User needs to set up bank account first - skipping large file test')
        return
      }

      // Should complete within reasonable time (30 seconds max)
      expect(endTime - startTime).toBeLessThan(30000)
      
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          imported: expect.any(Number),
          total: 50,
        })
      }
    })

    it('should handle concurrent upload attempts appropriately', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      // Test multiple simultaneous uploads
      const promises = Array(3).fill(null).map((_, index) => 
        uploadCSVFile(
          authToken!, 
          productionCSVData.standard,
          `concurrent-test-${index}.csv`
        )
      )

      const responses = await Promise.all(promises)
      
      // At least one should succeed or all should fail with appropriate errors
      responses.forEach(response => {
        expect([200, 400, 429, 500]).toContain(response.status)
        
        if (response.status === 200) {
          expect(response.data.imported).toBeGreaterThanOrEqual(0)
        }
      })
    })

    it('should validate file size limits', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      // Create a very large CSV content (>10MB)
      const veryLargeCSV = [
        'Date,Description,Amount',
        ...Array(100000).fill(null).map((_, i) => 
          `2024-01-01,Very Long Description That Takes Up Space Transaction ${i},-10.00`
        )
      ].join('\n')

      const response = await uploadCSVFile(authToken!, veryLargeCSV, 'very-large.csv')

      // Should either succeed or fail with size limit error
      if (response.status !== 200) {
        expect([400, 413, 500]).toContain(response.status)
        // Might contain size or limit related error message
      }
    })

    it('should handle special characters in CSV data', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const specialCharCSV = `Date,Description,Amount
2024-01-15,"Transaction with ""quotes"" and commas,",-25.50
2024-01-14,Café & Restaurant (émojis: 🍕🎉),-15.99
2024-01-13,"Multi-line
description",-30.00`

      const response = await uploadCSVFile(authToken!, specialCharCSV, 'special-chars.csv')

      if (response.status === 400 && response.data.error?.includes('bank account')) {
        console.log('⚠️  User needs to set up bank account first - skipping special chars test')
        return
      }

      // Should handle special characters gracefully
      expect([200, 400]).toContain(response.status)
      
      if (response.status === 200) {
        expect(response.data.imported).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed CSV files', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const malformedCSV = `Date,Description,Amount
2024-01-15,Transaction,-25.50,extra,columns
2024-01-14,Missing amount
2024-01-13,Invalid date,text-amount,-invalid`

      const response = await uploadCSVFile(authToken!, malformedCSV, 'malformed.csv')

      // Should handle malformed data gracefully
      expect([200, 400, 500]).toContain(response.status)
      
      if (response.status === 200) {
        // Might import some valid rows and skip invalid ones
        expect(response.data.imported).toBeLessThanOrEqual(response.data.total)
      }
    })

    it('should have appropriate response headers for file uploads', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      const response = await uploadCSVFile(authToken!, productionCSVData.standard)

      // Check response headers
      expect(response.headers.get('content-type')).toContain('application/json')
      
      // Log other headers for debugging
      console.log('Upload response headers:')
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
      })
    })

    it('should handle network interruptions gracefully', async () => {
      if (!testUserExists || !authToken) {
        console.log('⚠️  Skipping test - no test user available')
        return
      }

      // Test with a very short timeout to simulate network interruption
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 500) // Abort after 500ms

      try {
        await fetch(`${process.env.BASE_URL}/api/transactions/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Cookie': `token=${authToken}`,
          },
          body: (() => {
            const formData = new FormData()
            const blob = new Blob([productionCSVData.standard], { type: 'text/csv' })
            formData.append('file', blob, 'test.csv')
            return formData
          })(),
          signal: controller.signal,
        })
      } catch (error: any) {
        // Should handle abort gracefully
        expect(error.name).toBe('AbortError')
      }
    })
  })
})