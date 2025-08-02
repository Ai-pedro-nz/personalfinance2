import { Readable } from 'stream'

export interface MockCSVTransaction {
  date: string
  description: string
  amount: number | string
  [key: string]: any
}

export const createMockCSVContent = (transactions: MockCSVTransaction[]): string => {
  if (transactions.length === 0) return ''
  
  const headers = Object.keys(transactions[0])
  const headerRow = headers.join(',')
  const dataRows = transactions.map(transaction => 
    headers.map(header => {
      const value = transaction[header]
      // Wrap values containing commas in quotes
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : String(value)
    }).join(',')
  )
  
  return [headerRow, ...dataRows].join('\n')
}

export const createMockCSVFile = (transactions: MockCSVTransaction[]): File => {
  const csvContent = createMockCSVContent(transactions)
  const blob = new Blob([csvContent], { type: 'text/csv' })
  
  // Create a more explicit mock file object
  const mockFile = {
    name: 'test-transactions.csv',
    type: 'text/csv',
    size: csvContent.length,
    lastModified: Date.now(),
    webkitRelativePath: '',
    stream: () => new ReadableStream(),
    arrayBuffer: async () => new ArrayBuffer(csvContent.length),
    text: async () => csvContent,
    slice: (start, end, contentType) => blob.slice(start, end, contentType)
  }
  
  // Make it look like a File instance
  Object.setPrototypeOf(mockFile, File.prototype)
  
  return mockFile as File
}

export const createMockCSVBuffer = (transactions: MockCSVTransaction[]): Buffer => {
  const csvContent = createMockCSVContent(transactions)
  return Buffer.from(csvContent, 'utf-8')
}

export const createMockCSVStream = (transactions: MockCSVTransaction[]): Readable => {
  const csvContent = createMockCSVContent(transactions)
  return Readable.from([csvContent])
}

// Standard CSV test data templates
export const csvTestData = {
  // Standard format with common headers
  standard: [
    { date: '2024-01-15', description: 'McDonald\'s Restaurant', amount: -12.50 },
    { date: '2024-01-16', description: 'Salary Payment', amount: 2500.00 },
    { date: '2024-01-17', description: 'Supermarket Purchase', amount: -89.32 },
  ],

  // Different date formats
  variousDateFormats: [
    { date: '01/15/2024', description: 'Gas Station', amount: -45.00 },
    { date: '2024-01-16', description: 'Coffee Shop', amount: -5.50 },
    { date: '16-01-2024', description: 'Pharmacy', amount: -23.75 },
  ],

  // Different amount formats
  variousAmountFormats: [
    { date: '2024-01-15', description: 'Store Purchase', amount: '-$25.50' },
    { date: '2024-01-16', description: 'Refund', amount: '+15.00' },
    { date: '2024-01-17', description: 'Bill Payment', amount: '(100.00)' },
  ],

  // Edge cases
  edgeCases: [
    { date: '2024-01-15', description: 'Transaction with, comma', amount: -10.00 },
    { date: '2024-01-16', description: '"Quoted description"', amount: -20.00 },
    { date: '2024-01-17', description: 'Very long description that goes on and on and includes many details about the transaction', amount: -5.99 },
  ],

  // Empty and invalid data
  invalidData: [
    { date: '', description: 'Empty date', amount: -10.00 },
    { date: '2024-01-15', description: '', amount: -20.00 },
    { date: '2024-01-16', description: 'Invalid amount', amount: 'not-a-number' },
    { date: 'invalid-date', description: 'Invalid date format', amount: -30.00 },
  ],

  // Large dataset for performance testing
  large: Array.from({ length: 1000 }, (_, i) => ({
    date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
    description: `Transaction ${i + 1}`,
    amount: Math.round((Math.random() - 0.5) * 1000 * 100) / 100,
  })),
}

// CSV parsing test utilities
export const csvParsingHelpers = {
  // Create a FormData object with CSV file
  createFormDataWithCSV: (transactions: MockCSVTransaction[], filename = 'test.csv'): FormData => {
    const formData = new FormData()
    const file = createMockCSVFile(transactions)
    Object.defineProperty(file, 'name', { value: filename })
    formData.append('file', file)
    return formData
  },

  // Create multipart form data buffer (for API testing)
  createMultipartBuffer: (transactions: MockCSVTransaction[], boundary = 'boundary123'): Buffer => {
    const csvContent = createMockCSVContent(transactions)
    const multipartData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`,
      ''
    ].join('\r\n')
    
    return Buffer.from(multipartData, 'utf-8')
  },
}

// Mock file upload utilities
export const mockFileUpload = {
  // Mock multer file object
  createMockMulterFile: (transactions: MockCSVTransaction[]): Express.Multer.File => {
    const buffer = createMockCSVBuffer(transactions)
    return {
      fieldname: 'file',
      originalname: 'test-transactions.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: buffer.length,
      buffer,
      destination: '',
      filename: '',
      path: '',
      stream: createMockCSVStream(transactions),
    }
  },

  // Mock file upload request
  createMockUploadRequest: (transactions: MockCSVTransaction[]) => {
    const file = mockFileUpload.createMockMulterFile(transactions)
    return {
      file,
      files: [file],
      body: {},
    }
  },
}

// CSV validation helpers
export const csvValidation = {
  // Validate CSV structure
  validateCSVStructure: (csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { valid: false, error: 'Empty CSV' }
    
    const headerCount = lines[0].split(',').length
    const invalidRows = lines.slice(1).filter(line => 
      line.split(',').length !== headerCount
    )
    
    return {
      valid: invalidRows.length === 0,
      error: invalidRows.length > 0 ? 'Inconsistent column count' : null,
      rowCount: lines.length - 1,
      columnCount: headerCount,
    }
  },

  // Check for required headers
  hasRequiredHeaders: (csvContent: string, required = ['date', 'description', 'amount']) => {
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length === 0) return false
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    return required.every(req => headers.includes(req.toLowerCase()))
  },
}

// Test assertion helpers
export const csvAssertions = {
  // Assert CSV parsing results
  expectValidTransactions: (transactions: any[], expectedCount?: number) => {
    expect(Array.isArray(transactions)).toBe(true)
    if (expectedCount !== undefined) {
      expect(transactions).toHaveLength(expectedCount)
    }
    
    transactions.forEach((transaction, index) => {
      expect(transaction).toHaveProperty('date')
      expect(transaction).toHaveProperty('description')
      expect(transaction).toHaveProperty('amount')
      expect(typeof transaction.amount).toBe('number')
      expect(transaction.date instanceof Date).toBe(true)
    })
  },

  // Assert categorization results
  expectCategorizedTransactions: (transactions: any[]) => {
    transactions.forEach(transaction => {
      if (transaction.categoryId) {
        expect(typeof transaction.categoryId).toBe('string')
      }
    })
  },
}

// Mock CSV parser module
export const mockCSVParserModule = () => {
  const mockParsedResults: any[] = []
  
  jest.mock('@/lib/csv-parser', () => ({
    parseCSV: jest.fn().mockImplementation(() => Promise.resolve(mockParsedResults)),
    validateCSVHeaders: jest.fn().mockReturnValue(true),
    normalizeAmount: jest.fn().mockImplementation((amount) => {
      if (typeof amount === 'number') return amount
      return parseFloat(String(amount).replace(/[^-\d.]/g, ''))
    }),
    parseDate: jest.fn().mockImplementation((dateStr) => new Date(dateStr)),
  }))

  return {
    setMockResults: (results: any[]) => {
      mockParsedResults.splice(0, mockParsedResults.length, ...results)
    },
    clearMockResults: () => {
      mockParsedResults.splice(0)
    },
  }
}

// Placeholder test to satisfy Jest
describe('CSV Utils', () => {
  it('should export utility functions', () => {
    expect(typeof createMockCSVContent).toBe('function')
    expect(typeof createMockCSVFile).toBe('function')
    expect(typeof csvTestData.standard).toBe('object')
    expect(Array.isArray(csvTestData.standard)).toBe(true)
  })
})