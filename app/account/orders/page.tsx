import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createCookieClient } from '@/lib/supabase/server'
import type { Order } from '@/types'

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
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-2">My Orders</h1>
        <p className="text-stone-500 text-sm">{user.email}</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-stone-400 text-base">You haven't placed any orders yet.</p>
          <Link href="/order/new" className="btn-primary inline-flex">
            Place your first order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(order => (
            <Link
              key={order.id}
              href={`/order/${order.id}`}
              className="block bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1a1a1a]">{order.event_name}</p>
                  <p className="text-sm text-stone-500 capitalize">{order.event_type}</p>
                </div>
                <div className="text-right space-y-1 flex-shrink-0">
                  <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    {order.status}
                  </span>
                  <p className="text-xs text-stone-400">
                    {new Date(order.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-3 font-mono">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
