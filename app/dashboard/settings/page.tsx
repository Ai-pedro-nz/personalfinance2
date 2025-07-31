'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '../../../lib/theme-context'

interface Category {
  id: string
  name: string
  type: string
  color: string
  _count?: {
    transactions: number
  }
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
        <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred appearance</p>
      </div>
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        style={{
          backgroundColor: theme === 'dark' ? '#4F46E5' : '#E5E7EB'
        }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{
            transform: theme === 'dark' ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
          }}
        />
        <span className="sr-only">Toggle theme</span>
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense',
    color: '#6366F1'
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    category: Category | null
    show: boolean
  }>({ category: null, show: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories/stats')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      })

      if (response.ok) {
        const data = await response.json()
        setCategories([...categories, { ...data.category, _count: { transactions: 0 } }])
        setNewCategory({ name: '', type: 'expense', color: '#6366F1' })
        setShowAddForm(false)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Failed to add category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (category._count?.transactions === 0) {
      // No transactions, delete directly
      await deleteCategory(category.id)
    } else {
      // Show confirmation dialog
      setDeleteConfirm({ category, show: true })
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.category) return
    await deleteCategory(deleteConfirm.category.id)
    setDeleteConfirm({ category: null, show: false })
  }

  const deleteCategory = async (categoryId: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(categories.filter(cat => cat.id !== categoryId))
        alert(data.message)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900' : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
  }

  const predefinedColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', 
    '#F59E0B', '#10B981', '#06B6D4', '#84CC16'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-semibold text-gray-900 dark:text-white">Personal Finance</a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/transactions"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Transactions
              </a>
              <a
                href="/dashboard/upload"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Upload CSV
              </a>
              <span className="text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium">
                Settings
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Settings
                </h3>
              </div>

              <div className="mb-8 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Appearance</h4>
                <ThemeToggle />
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Category Management
                </h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {showAddForm ? 'Cancel' : 'Add Category'}
                </button>
              </div>

              {showAddForm && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Add New Category</h4>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Category Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="e.g., Groceries"
                        />
                      </div>
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Type
                        </label>
                        <select
                          id="type"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={newCategory.type}
                          onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Color
                        </label>
                        <div className="mt-1 flex space-x-2">
                          {predefinedColors.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 ${
                                newCategory.color === color ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewCategory({ ...newCategory, color })}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {submitting ? 'Adding...' : 'Add Category'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(category.type)}`}>
                            {category.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {category._count?.transactions || 0} transactions
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            disabled={submitting}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.category && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-600">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mt-4">
                Delete Category
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete the category "{deleteConfirm.category.name}"?
                </p>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  This will remove the category from {deleteConfirm.category._count?.transactions || 0} transactions and cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm({ category: null, show: false })}
                  className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}