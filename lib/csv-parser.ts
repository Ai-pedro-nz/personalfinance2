interface CSVTransaction {
  date: string
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
      const date = parseDate(dateStr)
      if (!date) continue

      // Combine Payee and Memo for description
      const description = `${payee.trim()} ${memo.trim()}`.trim()
      if (!description) continue

      // Parse amount (can be positive or negative)
      const amount = parseAmount(amountStr)
      
      if (isNaN(amount)) continue

      transactions.push({
        date: date.toISOString(),
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

function parseDate(dateStr: string): Date | null {
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