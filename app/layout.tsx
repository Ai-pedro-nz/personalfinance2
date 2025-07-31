import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '../lib/theme-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Personal Finance MVP',
  description: 'Simple personal finance tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <div className="bg-orange-100 dark:bg-orange-900 border-b border-orange-300 dark:border-orange-700 px-4 py-2">
            <div className="flex items-center justify-center">
              <span className="text-orange-800 dark:text-orange-200 text-sm font-medium">
                🚧 Development Branch - New Features in Progress
              </span>
            </div>
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}