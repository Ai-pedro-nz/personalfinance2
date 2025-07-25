interface CategoryRule {
  keywords: string[]
  categoryName: string
  priority: number // Higher priority rules are checked first
}

// Define categorization rules based on transaction descriptions
const categorizationRules: CategoryRule[] = [
  // Food & Dining
  {
    keywords: ['mcdonald', 'burger', 'pizza', 'restaurant', 'cafe', 'coffee', 'sushi', 'food', 'dining', 'takeaway', 'kfc', 'subway', 'dominos', 'sakura', 'kosmos'],
    categoryName: 'Food',
    priority: 10
  },
  
  // Transportation
  {
    keywords: ['petrol', 'gas', 'fuel', 'taxi', 'uber', 'parking', 'transport', 'bus', 'train', 'metro', 'bp', 'shell', 'mobil'],
    categoryName: 'Transportation',
    priority: 9
  },
  
  // Shopping
  {
    keywords: ['shop', 'store', 'mall', 'retail', 'purchase', 'buy', 'warehouse', 'supermarket', 'grocery', 'pak n save', 'countdown', 'new world'],
    categoryName: 'Shopping',
    priority: 8
  },
  
  // Entertainment
  {
    keywords: ['cinema', 'movie', 'theater', 'concert', 'game', 'entertainment', 'netflix', 'spotify', 'steam', 'xbox', 'playstation'],
    categoryName: 'Entertainment',
    priority: 8
  },
  
  // Utilities
  {
    keywords: ['power', 'electricity', 'gas', 'water', 'internet', 'phone', 'mobile', 'utility', 'bill', 'vodafone', 'spark', '2degrees'],
    categoryName: 'Utilities',
    priority: 7
  },
  
  // Healthcare
  {
    keywords: ['medical', 'doctor', 'pharmacy', 'hospital', 'health', 'dental', 'clinic', 'medicine', 'chemist'],
    categoryName: 'Healthcare',
    priority: 7
  },
  
  // Housing
  {
    keywords: ['rent', 'mortgage', 'property', 'housing', 'real estate', 'rates', 'insurance', 'home'],
    categoryName: 'Housing',
    priority: 6
  },
  
  // Income (positive amounts)
  {
    keywords: ['salary', 'wage', 'income', 'payment', 'deposit', 'transfer', 'tfr', 'harvey'],
    categoryName: 'Income',
    priority: 5
  }
]

export function categorizeTransactionBase(description: string, amount: number): string | null {
  const lowerDescription = description.toLowerCase()
  
  // For positive amounts, check if it's income first
  if (amount > 0) {
    const incomeRule = categorizationRules.find(rule => rule.categoryName === 'Income')
    if (incomeRule?.keywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'Income'
    }
  }
  
  // Sort rules by priority (higher first) and find first match
  const sortedRules = [...categorizationRules].sort((a, b) => b.priority - a.priority)
  
  for (const rule of sortedRules) {
    // Skip income category for negative amounts
    if (amount < 0 && rule.categoryName === 'Income') continue
    
    const hasMatch = rule.keywords.some(keyword => lowerDescription.includes(keyword))
    if (hasMatch) {
      return rule.categoryName
    }
  }
  
  return null // No category found
}

// Legacy function for backward compatibility
export function categorizeTransaction(description: string, amount: number): string | null {
  return categorizeTransactionBase(description, amount)
}

export function getCategorySuggestions(description: string, amount: number): string[] {
  const lowerDescription = description.toLowerCase()
  const suggestions: { category: string, score: number }[] = []
  
  for (const rule of categorizationRules) {
    // Skip income category for negative amounts
    if (amount < 0 && rule.categoryName === 'Income') continue
    
    const matchingKeywords = rule.keywords.filter(keyword => lowerDescription.includes(keyword))
    if (matchingKeywords.length > 0) {
      const score = matchingKeywords.length * rule.priority
      suggestions.push({ category: rule.categoryName, score })
    }
  }
  
  // Sort by score (highest first) and return category names
  return suggestions
    .sort((a, b) => b.score - a.score)
    .map(s => s.category)
    .slice(0, 3) // Return top 3 suggestions
}