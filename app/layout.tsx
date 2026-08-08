import type { Metadata, Viewport } from 'next'
import './globals.css'
import { display, body } from './fonts'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://mgprakashcatering.com'),
  title: {
    default: 'M G Prakash Catering — Bengaluru',
    template: '%s · M G Prakash Catering',
  },
  description:
    'Authentic South and North Indian catering for weddings, naming ceremonies, corporate events and celebrations across Bengaluru. Serving since 2000.',
  openGraph: {
    title: 'M G Prakash Catering',
    description:
      'Authentic South and North Indian catering for weddings and celebrations across Bengaluru. Serving since 2000.',
    locale: 'en_IN',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#1A1512',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
