'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  type: string
  color: string
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  categoryId?: string
  category?: Category
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTransaction, setUpdatingTransaction] = useState<string | null>(null)
  const [autoCategorizing, setAutoCategorizing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'categorized' | 'uncategorized'>('all')
  const [retraining, setRetraining] = useState(false)
  const [trainingStatus, setTrainingStatus] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'description' | 'amount' | 'category'
    direction: 'asc' | 'desc'
  }>({ key: 'date', direction: 'desc' })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (transactions.length > 0) {
      fetchTrainingStatus()
    }
  }, [transactions.length])

  const fetchTrainingStatus = async () => {
    const currentCategorizedCount = transactions.filter(t => t.categoryId !== null).length
    const currentUncategorizedCount = transactions.filter(t => t.categoryId === null).length
    
    try {
      const response = await fetch('/api/transactions/retrain')
      if (response.ok) {
        const data = await response.json()
        setTrainingStatus(data)
        console.log('Training status:', data)
      } else {
        console.error('Training status fetch failed:', response.status)
        // Set default status if API fails
        setTrainingStatus({
          canRetrain: currentCategorizedCount >= 5,
          categorizedCount: currentCategorizedCount,
          uncategorizedCount: currentUncategorizedCount,
          learnedPatternsCount: 0,
          minimumRequired: 5
        })
      }
    } catch (error) {
      console.error('Error fetching training status:', error)
      // Set default status if API fails
      setTrainingStatus({
        canRetrain: currentCategorizedCount >= 5,
        categorizedCount: currentCategorizedCount,
        uncategorizedCount: currentUncategorizedCount,
        learnedPatternsCount: 0,
        minimumRequired: 5
      })
    }
  }

  const fetchData = async () => {
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ])

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData.transactions || [])
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTransactionCategory = async (transactionId: string, categoryId: string) => {
    setUpdatingTransaction(transactionId)
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          categoryId: categoryId || null
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(prev =>
          prev.map(t =>
            t.id === transactionId ? data.transaction : t
          )
        )
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    } finally {
      setUpdatingTransaction(null)
    }
  }

  const fetchPreview = async () => {
    try {
      const response = await fetch('/api/transactions/auto-categorize')
      if (response.ok) {
        const data = await response.json()
        setPreviewData(data)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
    }
  }

  const runAutoCategorization = async () => {
    setAutoCategorizing(true)
    
    try {
      const response = await fetch('/api/transactions/auto-categorize', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Successfully auto-categorized ${data.categorizedCount} transactions!`)
        fetchData() // Refresh the transactions
        setShowPreview(false)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error auto-categorizing:', error)
      alert('Failed to auto-categorize transactions')
    } finally {
      setAutoCategorizing(false)
    }
  }

  const runRetraining = async () => {
    const currentCategorizedCount = transactions.filter(t => t.categoryId !== null).length
    
    if (currentCategorizedCount < 5) {
      alert(`You need at least 5 categorized transactions to retrain the AI. You currently have ${currentCategorizedCount}.`)
      return
    }

    console.log(`Starting retraining with ${currentCategorizedCount} categorized transactions`)
    setRetraining(true)
    
    try {
      const response = await fetch('/api/transactions/retrain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log('Retrain response status:', response.status)
      const data = await response.json()
      console.log('Retrain response data:', data)

      if (response.ok) {
        alert(data.message)
        fetchData() // Refresh the transactions
        fetchTrainingStatus() // Refresh training status
      } else {
        console.error('Retrain error details:', data)
        alert(`Error: ${data.error}${data.details ? '\nDetails: ' + data.details : ''}`)
      }
    } catch (error) {
      console.error('Error retraining AI:', error)
      alert(`Failed to retrain AI: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setRetraining(false)
    }
  }

  const handleSort = (key: 'date' | 'description' | 'amount' | 'category') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return '↕️'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      if (filterStatus === 'categorized') return transaction.categoryId !== null
      if (filterStatus === 'uncategorized') return transaction.categoryId === null
      return true
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      
      switch (sortConfig.key) {
        case 'date':
          return direction * (new Date(a.date).getTime() - new Date(b.date).getTime())
        case 'description':
          return direction * a.description.localeCompare(b.description)
        case 'amount':
          return direction * (a.amount - b.amount)
        case 'category':
          const aCat = a.category?.name || ''
          const bCat = b.category?.name || ''
          return direction * aCat.localeCompare(bCat)
        default:
          return 0
      }
    })

  const categorizedCount = transactions.filter(t => t.categoryId !== null).length
  const uncategorizedCount = transactions.filter(t => t.categoryId === null).length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-semibold">Personal Finance</a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/upload"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Upload CSV
              </a>
              <a
                href="/dashboard/settings"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Transactions ({filteredAndSortedTransactions.length} of {transactions.length})
                  </h3>
                  <div className="flex space-x-4 mt-2 text-sm text-gray-600">
                    <span className="text-green-600 font-medium">
                      {categorizedCount} categorized
                    </span>
                    <span className="text-orange-600 font-medium">
                      {uncategorizedCount} uncategorized
                    </span>
                    {trainingStatus && (
                      <span className="text-purple-600 font-medium">
                        🧠 {trainingStatus.learnedPatternsCount > 0 ? 'AI Trained' : 'No AI Training'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={runRetraining}
                    disabled={retraining || (trainingStatus ? !trainingStatus.canRetrain : categorizedCount < 5)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={categorizedCount < 5 ? `Need at least 5 categorized transactions (you have ${categorizedCount})` : 'Retrain AI with your categorizations'}
                  >
                    {retraining ? 'Retraining...' : '🧠 Retrain AI'}
                  </button>
                  <button
                    onClick={fetchPreview}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Auto-Categorize
                  </button>
                  <a
                    href="/dashboard/upload"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Upload More
                  </a>
                </div>
              </div>

              <div className="mb-4 flex space-x-4">
                <div>
                  <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filter
                  </label>
                  <select
                    id="filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'categorized' | 'uncategorized')}
                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Transactions</option>
                    <option value="categorized">Categorized Only</option>
                    <option value="uncategorized">Uncategorized Only</option>
                  </select>
                </div>
              </div>

              {filteredAndSortedTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    {transactions.length === 0 ? 'No transactions found' : `No ${filterStatus} transactions found`}
                  </div>
                  {transactions.length === 0 && (
                    <a
                      href="/dashboard/upload"
                      className="text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Upload your first CSV file
                    </a>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            <span className="text-gray-400">{getSortIcon('date')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('description')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Description</span>
                            <span className="text-gray-400">{getSortIcon('description')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('amount')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Amount</span>
                            <span className="text-gray-400">{getSortIcon('amount')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Category</span>
                            <span className="text-gray-400">{getSortIcon('category')}</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <select
                              value={transaction.categoryId || ''}
                              onChange={(e) => updateTransactionCategory(transaction.id, e.target.value)}
                              disabled={updatingTransaction === transaction.id}
                              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                              <option value="">Uncategorized</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {transaction.category && (
                              <div className="mt-1">
                                <span
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: transaction.category.color + '20', color: transaction.category.color }}
                                >
                                  {transaction.category.name}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showPreview && previewData && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Auto-Categorization Preview
                      </h3>
                      
                      <div className="mb-4 p-4 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          Found {previewData.totalUncategorized} uncategorized transactions.
                          {previewData.wouldBeCategorized} can be auto-categorized.
                        </p>
                      </div>

                      <div className="max-h-96 overflow-y-auto mb-4">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Amount
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Suggested Category
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {previewData.preview.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                                  {item.description}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium">
                                  <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(item.amount)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  <span className={item.suggestedCategory === 'No suggestion' ? 'text-gray-400' : 'text-green-600 font-medium'}>
                                    {item.suggestedCategory}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setShowPreview(false)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={runAutoCategorization}
                          disabled={autoCategorizing || previewData.wouldBeCategorized === 0}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {autoCategorizing ? 'Processing...' : `Categorize ${previewData.wouldBeCategorized} Transactions`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}