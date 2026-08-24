import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createCookieClient } from '@/lib/supabase/server'
import { orderRef } from '@/lib/format'
import { EVENT_TYPE_LABELS } from '@/types'
import type { Order } from '@/types'

/** Signed-in only, and personal. Nothing here should ever reach an index. */
export const metadata: Metadata = {
  title: 'My Quote Requests',
  robots: { index: false, follow: false },
}

export default async function MyOrdersPage() {
  const supabase = await createCookieClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/account/orders')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (orders ?? []) as Order[]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--ink)] mb-2">My Orders</h1>
        <p className="text-[var(--ink-3)] text-sm">{user.email}</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-[var(--ink-3)] text-base">You haven&rsquo;t placed any orders yet.</p>
          <Link href="/order/new" className="btn btn-primary">
            Place your first order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(order => (
            <Link
              key={order.id}
              href={`/order/${order.id}`}
              className="block bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 hover:shadow-[var(--shadow-lift)] transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--ink)]">{order.event_name}</p>
                  <p className="text-sm text-[var(--ink-3)]">
                    {EVENT_TYPE_LABELS[order.event_type] ?? order.event_type}
                  </p>
                </div>
                <div className="text-right space-y-1 flex-shrink-0">
                  {/* "Submitted" is a state, not a success — a green pill
                      reads as a completed transaction, which this isn't yet:
                      it's confirmed by phone before anything is settled. */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" aria-hidden="true" />
                    {order.status}
                  </span>
                  <p className="text-xs text-[var(--ink-3)]">
                    {new Date(order.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--ink-3)] mt-3 font-mono">
                #{orderRef(order.id)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
