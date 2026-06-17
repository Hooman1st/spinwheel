import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'چرخ و فلک جایزه',
  description: 'در کمپین ما شرکت کنید و جایزه ببرید!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
