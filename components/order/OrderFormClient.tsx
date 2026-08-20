'use client'

import dynamic from 'next/dynamic'
import type { Dish } from '@/types'

/**
 * Loads the quote form on the client only.
 *
 * `ssr: false` is the point of this file. The form restores an in-progress
 * draft from sessionStorage in a state initialiser, which is the only way to
 * have the restored values present on the very first render — and it is only
 * legitimate if there is no server render to disagree with. Server-rendering an
 * empty form and then hydrating it full is a mismatch on every input.
 *
 * Nothing is lost to search engines. The indexable content of /order/new — the
 * h1, the reassurance copy, the metadata — lives in the page itself, outside
 * this boundary. A five-step form with no URL of its own was never contributing
 * to the page's text.
 *
 * `next/dynamic` with `ssr: false` cannot be called from a server component,
 * which is why this thin client wrapper exists rather than the option being
 * passed at the import in page.tsx.
 */
const OrderForm = dynamic(() => import('./OrderForm').then(m => m.OrderForm), {
  ssr: false,
  // Matches the height of the step indicator plus the first step, so the page
  // does not jump when the form arrives.
  loading: () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-12" aria-busy="true">
      <div className="h-8 mb-8 rounded-[var(--r-pill)] bg-[var(--surface-2)] animate-pulse" />
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-11 rounded-[var(--r-md)] bg-[var(--surface-2)] animate-pulse" />
        <div className="h-11 rounded-[var(--r-md)] bg-[var(--surface-2)] animate-pulse" />
        <div className="h-11 rounded-[var(--r-md)] bg-[var(--surface-2)] animate-pulse" />
      </div>
      <span className="sr-only">Loading the quote form…</span>
    </div>
  ),
})

export function OrderFormClient(props: {
  dishes: Dish[]
  initialName?: string
  initialEmail?: string
}) {
  return <OrderForm {...props} />
}
