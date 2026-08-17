import type { Metadata } from 'next'

/**
 * Exists solely to carry `noindex` for everything under /auth.
 *
 * The login page is a client component and a `'use client'` module cannot
 * export `metadata` — Next only reads that export from server components, and
 * it fails silently rather than erroring, which is how a sign-in page ends up
 * indexed. A layout is a server component by default, so the directive lands
 * here and covers the callback route alongside it.
 *
 * A sign-in screen in the index is pure noise: it ranks for the brand name,
 * competes with the pages that should rank, and offers a searcher nothing.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
