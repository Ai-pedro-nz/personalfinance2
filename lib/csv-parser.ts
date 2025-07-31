interface CSVTransaction {
  date: Date
  description: string
  amount: number
}

export function parseISPBankCSV(csvContent: string): CSVTransaction[] {
  const lines = csvContent.trim().split('\n')
  const transactions: CSVTransaction[] = []

  // Skip first 8 lines (6 metadata lines + headers + empty line)
  // Transaction data starts from line 9 (index 8)
  const startIndex = 8

  if (lines.length <= startIndex) {
    return transactions // Not enough lines for this format
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by comma, handling quoted fields
    const fields = parseCSVLine(line)
    
    // Expected format: Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
    if (fields.length >= 7) {
      const [dateStr, , , , payee, memo, amountStr] = fields
      
      // Parse date (format: YYYY/MM/DD)
      const date = parseISPDate(dateStr)
      if (!date) continue

      // Combine Payee and Memo for description
      const description = `${payee.trim()} ${memo.trim()}`.trim()
      if (!description) continue

      // Parse amount (can be positive or negative)
      const amount = parseAmount(amountStr)
      
      if (isNaN(amount)) continue

      transactions.push({
        date,
        description,
        amount
      })
    }
  }

  return transactions
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  fields.push(current)
  return fields.map(field => field.replace(/^"|"$/g, '').trim())
}

function parseISPDate(dateStr: string): Date | null {
  // Handle YYYY/MM/DD format
  const yyyymmddMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
    if (!isNaN(date.getTime())) return date
  }
  
  // Fallback to other formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, part1, part2, part3] = match
      
      // Assume DD/MM/YYYY format
      if (format === formats[0]) {
        const day = parseInt(part1, 10)
        const month = parseInt(part2, 10) - 1 // JS months are 0-indexed
        const year = parseInt(part3, 10)
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) return date
      }
      
      // YYYY-MM-DD
      if (format === formats[1]) {
        const year = parseInt(part1, 10)
        const month = parseInt(part2, 10) - 1
        const day = parseInt(part3, 10)
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) return date
      }
    }
  }
  
  return null
}

function parseAmount(amountStr: string): number {
  // Remove currency symbols, spaces, and commas
  const cleaned = amountStr.replace(/[$€£¥₹,\s]/g, '')
  
  // Handle parentheses for negative amounts
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1))
  }
  
  return parseFloat(cleaned)
}

// Generic CSV parser that the tests expect
export async function parseCSV(buffer: Buffer): Promise<CSVTransaction[]> {
  const csvContent = buffer.toString('utf-8')
  
  if (!csvContent.trim()) {
    throw new Error('Empty CSV file')
  }
  
  const lines = csvContent.trim().split('\n')
  if (lines.length === 0) {
    throw new Error('Empty CSV file')
  }
  
  // Parse header
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  
  if (!validateCSVHeaders(headers)) {
    throw new Error('Missing required headers: date, description, amount')
  }
  
  const transactions: CSVTransaction[] = []
  
  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    try {
      const fields = parseCSVLine(line)
      if (fields.length !== headers.length) continue
      
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = fields[index]
      })
      
      // Parse date
      const dateValue = row.date || row.Date
      if (!dateValue) continue
      
      const parsedDate = parseDate(dateValue)
      if (!parsedDate) continue
      
      // Parse description
      const description = row.description || row.Description || ''
      if (!description.trim()) continue
      
      // Parse amount
      const amountValue = row.amount || row.Amount
      if (!amountValue) continue
      
      const amount = normalizeAmount(amountValue)
      if (isNaN(amount)) continue
      
      transactions.push({
        date: parsedDate,
        description: description.trim(),
        amount
      })
    } catch (error) {
      // Skip invalid rows
      continue
    }
  }
  
  return transactions
}

export function validateCSVHeaders(headers: string[]): boolean {
  const requiredHeaders = ['date', 'description', 'amount']
  return requiredHeaders.every(required => 
    headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
  )
}

export function normalizeAmount(amount: string | number): number {
  if (typeof amount === 'number') return amount
  
  const amountStr = String(amount).trim()
  if (!amountStr) throw new Error('Invalid amount format')
  
  // Handle parentheses (negative)
  if (amountStr.startsWith('(') && amountStr.endsWith(')')) {
    const innerAmount = amountStr.slice(1, -1)
    return -normalizeAmount(innerAmount)
  }
  
  // Remove currency symbols, spaces, and commas
  let cleaned = amountStr.replace(/[$€£¥₹,\s]/g, '')
  
  // Handle explicit positive sign
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1)
  }
  
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) {
    throw new Error('Invalid amount format')
  }
  
  return parsed
}

export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr
  
  const str = String(dateStr).trim()
  if (!str) throw new Error('Invalid date format')
  
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
  ]
  
  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      const [, part1, part2, part3] = match
      
      // YYYY-MM-DD or YYYY/MM/DD
      if (format === formats[0] || format === formats[3]) {
        const year = parseInt(part1, 10)
        const monthNum = parseInt(part2, 10)
        const dayNum = parseInt(part3, 10)
        
        // Validate ranges before creating date
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
          continue // Skip this match, try next format
        }
        
        const month = monthNum - 1
        const date = new Date(year, month, dayNum)
        
        // Ensure the date components didn't overflow
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === dayNum) {
          return date
        }
      }
      
      // MM/DD/YYYY or DD/MM/YYYY (assume MM/DD/YYYY)
      if (format === formats[1]) {
        const month = parseInt(part1, 10) - 1
        const day = parseInt(part2, 10)
        const year = parseInt(part3, 10)
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) return date
      }
      
      // DD-MM-YYYY
      if (format === formats[2]) {
        const day = parseInt(part1, 10)
        const month = parseInt(part2, 10) - 1
        const year = parseInt(part3, 10)
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) return date
      }
    }
  }
  
  // Check for obviously invalid patterns first
  if (str === 'invalid-date' || str === '') {
    throw new Error('Invalid date format')
  }
  
  // Check for invalid month/day values in YYYY-MM-DD format
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, , month, day] = isoMatch
    const monthNum = parseInt(month, 10)
    const dayNum = parseInt(day, 10)
    if (monthNum > 12 || monthNum < 1 || dayNum > 31 || dayNum < 1) {
      throw new Error('Invalid date format')
    }
    // Also validate that the date is actually valid when constructed
    const testDate = new Date(parseInt(isoMatch[1], 10), monthNum - 1, dayNum)
    if (isNaN(testDate.getTime())) {
      throw new Error('Invalid date format')
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(str)
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate
  }
  
  throw new Error('Invalid date format')
}