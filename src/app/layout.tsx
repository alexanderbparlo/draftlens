import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Syne } from 'next/font/google'
import './globals.css'

const fontDisplay = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const fontBody = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

const fontMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'DraftLens — Financial Statement Comparison',
  description:
    'Side-by-side comparison of prior year and current year fund financial statements. Variance, language, and clerical analysis powered by Claude Opus 4.7.',
  keywords: ['financial statements', 'fund accounting', 'variance analysis', 'audit', 'ASC 946', 'AI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`
          ${fontDisplay.variable}
          ${fontBody.variable}
          ${fontMono.variable}
          font-body
          bg-surface-950
          text-text-primary
          antialiased
          min-h-screen
        `}
      >
        {children}
      </body>
    </html>
  )
}
