import { parseCSV, validateCSVHeaders, normalizeAmount, parseDate } from '@/lib/csv-parser'
import { 
  csvTestData, 
  createMockCSVBuffer, 
  csvValidation, 
  csvAssertions 
} from '../utils/csv-utils'

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse standard CSV format correctly', async () => {
      const buffer = createMockCSVBuffer(csvTestData.standard)
      const results = await parseCSV(buffer)

      csvAssertions.expectValidTransactions(results, csvTestData.standard.length)
      
      expect(results[0]).toEqual({
        date: new Date('2024-01-15'),
        description: "McDonald's Restaurant",
        amount: -12.50,
      })
    })

    it('should handle various date formats', async () => {
      const testData = [
        { date: '2024-01-15', description: 'ISO format', amount: -10.00 },
        { date: '01/15/2024', description: 'US format', amount: -20.00 },
        { date: '15-01-2024', description: 'EU format', amount: -30.00 },
      ]
      
      const buffer = createMockCSVBuffer(testData)
      const results = await parseCSV(buffer)

      results.forEach(result => {
        expect(result.date).toBeInstanceOf(Date)
        expect(result.date.getFullYear()).toBe(2024)
        expect(result.date.getMonth()).toBe(0) // January (0-indexed)
        expect(result.date.getDate()).toBe(15)
      })
    })

    it('should handle various amount formats', async () => {
      const testData = [
        { date: '2024-01-15', description: 'Negative', amount: '-25.50' },
        { date: '2024-01-16', description: 'Positive', amount: '+100.00' },
        { date: '2024-01-17', description: 'Parentheses', amount: '(50.00)' },
        { date: '2024-01-18', description: 'Currency', amount: '$75.25' },
      ]
      
      const buffer = createMockCSVBuffer(testData)
      const results = await parseCSV(buffer)

      expect(results[0].amount).toBe(-25.50)
      expect(results[1].amount).toBe(100.00)
      expect(results[2].amount).toBe(-50.00) // Parentheses indicate negative
      expect(results[3].amount).toBe(75.25)
    })

    it('should handle CSV with commas in descriptions', async () => {
      const buffer = createMockCSVBuffer(csvTestData.edgeCases)
      const results = await parseCSV(buffer)

      const transactionWithComma = results.find(r => 
        r.description.includes('Transaction with, comma')
      )
      expect(transactionWithComma).toBeDefined()
      expect(transactionWithComma!.description).toBe('Transaction with, comma')
    })

    it('should skip invalid rows and continue processing', async () => {
      const testData = [
        { date: '2024-01-15', description: 'Valid', amount: -10.00 },
        { date: 'invalid-date', description: 'Invalid date', amount: -20.00 },
        { date: '2024-01-17', description: 'Valid again', amount: -30.00 },
      ]
      
      const buffer = createMockCSVBuffer(testData)
      const results = await parseCSV(buffer)

      expect(results).toHaveLength(2) // Only valid rows
      expect(results[0].description).toBe('Valid')
      expect(results[1].description).toBe('Valid again')
    })

    it('should handle empty CSV', async () => {
      const buffer = Buffer.from('', 'utf-8')
      
      await expect(parseCSV(buffer)).rejects.toThrow('Empty CSV file')
    })

    it('should handle CSV with only headers', async () => {
      const buffer = Buffer.from('date,description,amount\n', 'utf-8')
      const results = await parseCSV(buffer)
      
      expect(results).toHaveLength(0)
    })

    it('should handle large CSV files', async () => {
      const buffer = createMockCSVBuffer(csvTestData.large)
      const results = await parseCSV(buffer)

      expect(results).toHaveLength(csvTestData.large.length)
      csvAssertions.expectValidTransactions(results)
    })
  })

  describe('validateCSVHeaders', () => {
    it('should validate required headers are present', () => {
      const headers = ['date', 'description', 'amount', 'category']
      expect(validateCSVHeaders(headers)).toBe(true)
    })

    it('should accept headers in different order', () => {
      const headers = ['amount', 'date', 'description']
      expect(validateCSVHeaders(headers)).toBe(true)
    })

    it('should accept headers with different casing', () => {
      const headers = ['Date', 'DESCRIPTION', 'Amount']
      expect(validateCSVHeaders(headers)).toBe(true)
    })

    it('should reject headers missing required fields', () => {
      const headers = ['date', 'description'] // Missing amount
      expect(validateCSVHeaders(headers)).toBe(false)
    })

    it('should accept additional headers', () => {
      const headers = ['date', 'description', 'amount', 'category', 'notes']
      expect(validateCSVHeaders(headers)).toBe(true)
    })
  })

  describe('normalizeAmount', () => {
    it('should normalize positive amounts', () => {
      expect(normalizeAmount('100.50')).toBe(100.50)
      expect(normalizeAmount('+100.50')).toBe(100.50)
      expect(normalizeAmount('$100.50')).toBe(100.50)
    })

    it('should normalize negative amounts', () => {
      expect(normalizeAmount('-100.50')).toBe(-100.50)
      expect(normalizeAmount('(100.50)')).toBe(-100.50)
      expect(normalizeAmount('-$100.50')).toBe(-100.50)
    })

    it('should handle already normalized numbers', () => {
      expect(normalizeAmount(100.50)).toBe(100.50)
      expect(normalizeAmount(-100.50)).toBe(-100.50)
    })

    it('should handle strings with extra spaces', () => {
      expect(normalizeAmount('  100.50  ')).toBe(100.50)
      expect(normalizeAmount('  -100.50  ')).toBe(-100.50)
    })

    it('should throw error for invalid amounts', () => {
      expect(() => normalizeAmount('not-a-number')).toThrow('Invalid amount format')
      expect(() => normalizeAmount('')).toThrow('Invalid amount format')
      expect(() => normalizeAmount('abc123')).toThrow('Invalid amount format')
    })
  })

  describe('parseDate', () => {
    it('should parse ISO date format', () => {
      const date = parseDate('2024-01-15')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(15)
    })

    it('should parse US date format', () => {
      const date = parseDate('01/15/2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
    })

    it('should parse European date format', () => {
      const date = parseDate('15-01-2024')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
    })

    it('should handle Date objects', () => {
      const inputDate = new Date('2024-01-15')
      const result = parseDate(inputDate)
      expect(result).toEqual(inputDate)
    })

    it('should throw error for invalid dates', () => {
      expect(() => parseDate('invalid-date')).toThrow('Invalid date format')
      expect(() => parseDate('')).toThrow('Invalid date format')
      expect(() => parseDate('2024-13-45')).toThrow('Invalid date format')
    })
  })
})