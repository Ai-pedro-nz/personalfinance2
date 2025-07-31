'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BankAccount {
  id: string
  name: string
  accountType: string
}

interface Category {
  name: string
  color: string
  amount: number
  count: number
}

interface RecentTransaction {
  id: string
  date: string
  description: string
  amount: number
  category?: {
    name: string
    color: string
  }
}

interface DashboardData {
  totalTransactions: number
  currentBalance: number
  totalIncome: number
  totalExpenses: number
  categoryBreakdown: Category[]
  recentTransactions: RecentTransaction[]
}

export default function DashboardPage() {
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    accountType: 'checking'
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [bankAccountRes, dashboardRes] = await Promise.all([
        fetch('/api/bankaccount'),
        fetch('/api/dashboard')
      ])

      if (bankAccountRes.status === 401 || dashboardRes.status === 401) {
        router.push('/login')
        return
      }

      const bankAccountData = await bankAccountRes.json()
      setBankAccount(bankAccountData.bankAccount)
      
      if (bankAccountData.bankAccount) {
        setFormData({
          name: bankAccountData.bankAccount.name,
          accountType: bankAccountData.bankAccount.accountType
        })
      }

      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json()
        setDashboardData(dashData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const method = bankAccount ? 'PUT' : 'POST'
      const response = await fetch('/api/bankaccount', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setBankAccount(data.bankAccount)
        setShowAccountForm(false)
        fetchData() // Refresh dashboard data
      } else {
        setError(data.error)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold dark:text-white">Personal Finance</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard/transactions"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Transactions
              </a>
              <a
                href="/dashboard/upload"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Upload CSV
              </a>
              <a
                href="/dashboard/settings"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Development Banner */}
          <div className="mb-6 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 dark:border-yellow-400 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🚧</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Development Version - Auto-Categorization Features Coming Soon
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  This version includes enhanced ML training and improved categorization algorithms
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Bank Account
                  </h3>
                  <button
                    onClick={() => setShowAccountForm(!showAccountForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {bankAccount ? 'Edit Account' : 'Add Account'}
                  </button>
                </div>

                {bankAccount && !showAccountForm ? (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Name:</strong> {bankAccount.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Type:</strong> {bankAccount.accountType}
                    </p>
                  </div>
                ) : showAccountForm ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Type
                      </label>
                      <select
                        id="accountType"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.accountType}
                        onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="credit">Credit Card</option>
                      </select>
                    </div>
                    {error && (
                      <div className="text-red-600 text-sm">{error}</div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAccountForm(false)}
                        className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No bank account added yet.</p>
                )}
              </div>
            </div>

            {bankAccount && dashboardData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">$</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Current Balance
                            </dt>
                            <dd className="text-lg font-medium text-gray-900 dark:text-white">
                              {formatCurrency(dashboardData.currentBalance)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">+</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Total Income
                            </dt>
                            <dd className="text-lg font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(dashboardData.totalIncome)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">-</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Total Expenses
                            </dt>
                            <dd className="text-lg font-medium text-red-600 dark:text-red-400">
                              {formatCurrency(dashboardData.totalExpenses)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">#</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Transactions
                            </dt>
                            <dd className="text-lg font-medium text-gray-900 dark:text-white">
                              {dashboardData.totalTransactions}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                        Spending by Category
                      </h3>
                      {dashboardData?.categoryBreakdown?.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData?.categoryBreakdown?.slice(0, 5).map((category, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div
                                  className="w-4 h-4 rounded-full mr-3"
                                  style={{ backgroundColor: category.color }}
                                ></div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {category.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                  ({category.count})
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(category.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No categorized transactions yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                        Recent Transactions
                      </h3>
                      {dashboardData?.recentTransactions?.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData?.recentTransactions?.slice(0, 5).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {transaction.description}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(transaction.date)}
                                  {transaction.category && (
                                    <span
                                      className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                      style={{ 
                                        backgroundColor: transaction.category.color + '20',
                                        color: transaction.category.color
                                      }}
                                    >
                                      {transaction.category.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium">
                                <span className={transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {formatCurrency(transaction.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="mt-4">
                            <a
                              href="/dashboard/transactions"
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                            >
                              View all transactions →
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No transactions yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a
                        href="/dashboard/upload"
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-3 rounded-md text-center font-medium"
                      >
                        Upload Transactions
                      </a>
                      <a
                        href="/dashboard/transactions"
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-3 rounded-md text-center font-medium"
                      >
                        View Transactions
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}