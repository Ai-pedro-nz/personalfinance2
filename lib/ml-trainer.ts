interface TrainingData {
  description: string
  amount: number
  categoryName: string
}

interface LearnedPattern {
  keywords: string[]
  categoryName: string
  confidence: number
  occurrences: number
}

// Extract meaningful keywords from transaction descriptions
function extractKeywords(description: string): string[] {
  const text = description.toLowerCase()
  
  // Remove common words that don't help with categorization
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning',
    'ltd', 'limited', 'inc', 'llc', 'corp', 'co', 'company', 'eftpos', 'pos', 'atm'
  ])
  
  // Extract words (3+ characters) and remove stop words
  const words = text
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
  
  // Also extract meaningful bigrams (two-word combinations)
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`
    if (bigram.length >= 6) { // Only meaningful bigrams
      bigrams.push(bigram)
    }
  }
  
  return [...new Set([...words, ...bigrams])] // Remove duplicates
}

// Train the model from user's categorized transactions
export function trainFromUserData(trainingData: TrainingData[]): LearnedPattern[] {
  const patternMap = new Map<string, Map<string, number>>() // keyword -> category -> count
  const categoryKeywords = new Map<string, Set<string>>() // category -> keywords
  
  // Process each training example
  trainingData.forEach(({ description, amount, categoryName }) => {
    const keywords = extractKeywords(description)
    
    // Track keywords for this category
    if (!categoryKeywords.has(categoryName)) {
      categoryKeywords.set(categoryName, new Set())
    }
    const catKeywords = categoryKeywords.get(categoryName)!
    
    keywords.forEach(keyword => {
      catKeywords.add(keyword)
      
      // Update pattern counts
      if (!patternMap.has(keyword)) {
        patternMap.set(keyword, new Map())
      }
      const keywordCounts = patternMap.get(keyword)!
      keywordCounts.set(categoryName, (keywordCounts.get(categoryName) || 0) + 1)
    })
  })
  
  // Generate learned patterns
  const learnedPatterns: LearnedPattern[] = []
  
  categoryKeywords.forEach((keywords, categoryName) => {
    const keywordArray = Array.from(keywords)
    const categoryTransactions = trainingData.filter(t => t.categoryName === categoryName)
    
    // Calculate confidence based on how often these keywords appear for this category
    const totalOccurrences = keywordArray.reduce((sum, keyword) => {
      const keywordCounts = patternMap.get(keyword)
      if (!keywordCounts) return sum
      
      const categoryCount = keywordCounts.get(categoryName) || 0
      const totalCount = Array.from(keywordCounts.values()).reduce((a, b) => a + b, 0)
      
      return sum + (categoryCount / totalCount)
    }, 0)
    
    const confidence = Math.min(totalOccurrences / keywordArray.length, 1.0)
    
    // Only include patterns with reasonable confidence and occurrence
    if (confidence > 0.3 && categoryTransactions.length >= 2) {
      learnedPatterns.push({
        keywords: keywordArray,
        categoryName,
        confidence,
        occurrences: categoryTransactions.length
      })
    }
  })
  
  // Sort by confidence and occurrences
  return learnedPatterns.sort((a, b) => {
    const scoreA = a.confidence * Math.log(a.occurrences + 1)
    const scoreB = b.confidence * Math.log(b.occurrences + 1)
    return scoreB - scoreA
  })
}

// Use learned patterns to categorize a transaction
export function categorizeWithLearnedPatterns(
  description: string, 
  amount: number, 
  learnedPatterns: LearnedPattern[]
): { category: string | null, confidence: number } {
  const keywords = extractKeywords(description)
  const scores = new Map<string, number>()
  
  // Calculate scores for each category based on keyword matches
  learnedPatterns.forEach(pattern => {
    const matchingKeywords = pattern.keywords.filter(keyword => 
      keywords.some(k => k.includes(keyword) || keyword.includes(k))
    )
    
    if (matchingKeywords.length > 0) {
      const matchRatio = matchingKeywords.length / pattern.keywords.length
      const score = matchRatio * pattern.confidence * Math.log(pattern.occurrences + 1)
      
      const currentScore = scores.get(pattern.categoryName) || 0
      scores.set(pattern.categoryName, currentScore + score)
    }
  })
  
  // Find the best category
  let bestCategory: string | null = null
  let bestScore = 0
  
  scores.forEach((score, category) => {
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  })
  
  // Only return if confidence is above threshold
  const confidence = Math.min(bestScore, 1.0)
  return {
    category: confidence > 0.5 ? bestCategory : null,
    confidence
  }
}

// Combine learned patterns with base rules for hybrid approach
export function hybridCategorize(
  description: string,
  amount: number,
  learnedPatterns: LearnedPattern[],
  baseCategorizeFunction: (desc: string, amt: number) => string | null
): string | null {
  // First try learned patterns (higher priority for user's preferences)
  const learnedResult = categorizeWithLearnedPatterns(description, amount, learnedPatterns)
  
  if (learnedResult.category && learnedResult.confidence > 0.6) {
    return learnedResult.category
  }
  
  // Fall back to base categorization rules
  const baseResult = baseCategorizeFunction(description, amount)
  
  // If learned patterns have low confidence, prefer base rules
  if (baseResult && (!learnedResult.category || learnedResult.confidence < 0.4)) {
    return baseResult
  }
  
  // Return learned result if it exists, otherwise base result
  return learnedResult.category || baseResult
}