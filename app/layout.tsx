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
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}