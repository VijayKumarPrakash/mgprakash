'use client'

import Link from 'next/link'
import { addDishToStoredDraft } from '@/lib/order-draft-storage'

/**
 * "Add this to a quote", on a dish page.
 *
 * The button used to be a plain link to /order/new, which meant a customer who
 * had reached the dish page *from* the middle of building a menu was handed an
 * empty form — the exact opposite of what the label promises. Now the dish is
 * written onto the active meal of the in-progress draft on the way past, and
 * /order/new resumes at dish selection with it already selected.
 *
 * The storage read happens in the click handler, not during render, which is
 * deliberate: this component is server-rendered as part of the dish page, so
 * reading sessionStorage while rendering would mean the server and the client
 * disagreeing about the label. A click only ever happens in a browser.
 *
 * It stays a real `<Link>` with a real href for the same reason — crawlable,
 * middle-clickable, and it still works if the click handler never runs. When
 * there is no draft in progress `addDishToStoredDraft` does nothing and the
 * link behaves exactly as it did before.
 */
export function AddToQuoteButton({
  dishId,
  className,
  children = 'Add this to a quote',
}: {
  dishId: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Link
      href="/order/new"
      // No preventDefault: the write is synchronous, so it completes before
      // navigation begins and Link's own prefetching still applies.
      onClick={() => addDishToStoredDraft(dishId)}
      className={className}
    >
      {children}
    </Link>
  )
}
