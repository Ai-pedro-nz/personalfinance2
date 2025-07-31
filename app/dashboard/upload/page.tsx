'use client'

import { useState } from 'react'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    message: string
    imported?: number
    total?: number
    skipped?: number
  } | null>(null)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      const response = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('csvFile') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setError(data.error)
      }
    } catch {
      setError('An error occurred while uploading the file.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-semibold dark:text-white">Personal Finance</a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/transactions"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Transactions
              </a>
              <a
                href="/dashboard/settings"
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Upload Transaction CSV
              </h3>

              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• First column: Date (DD/MM/YYYY format)</li>
                  <li>• Second column: Description</li>
                  <li>• Third column: Amount (positive for income, negative for expenses)</li>
                  <li>• Fourth column: Balance</li>
                  <li>• Header row is optional and will be automatically detected</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select CSV File
                  </label>
                  <div className="mt-1">
                    <input
                      type="file"
                      id="csvFile"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
                      required
                    />
                  </div>
                </div>

                {file && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={!file || uploading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Transactions'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 rounded-md">
                  <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
                </div>
              )}

              {result && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-md">
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <div className="font-medium">{result.message}</div>
                    {result.imported !== undefined && (
                      <div className="mt-2">
                        <div>Imported: {result.imported} transactions</div>
                        <div>Total in file: {result.total} transactions</div>
                        {result.skipped ? <div>Skipped (duplicates): {result.skipped} transactions</div> : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <a
                  href="/dashboard/transactions"
                  className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                >
                  View all transactions →
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}