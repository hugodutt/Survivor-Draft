import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Survivor Draft',
  description: 'A multiplayer game of survival choices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} animated-gradient`}>
        <div className="min-h-screen backdrop-blur-sm">
          {children}
        </div>
      </body>
    </html>
  )
} 