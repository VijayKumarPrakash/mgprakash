import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrderWithMeals } from '@/lib/orders'
import { formatDate, formatTime, orderRef } from '@/lib/format'
import { EVENT_TYPE_LABELS } from '@/types'

/**
 * Never indexed.
 *
 * This URL is a capability: the uuid is the only thing protecting it, which is
 * what lets the emailed link work without a login, and public SELECT on
 * `orders` is deliberate for the same reason. That makes indexing actively
 * dangerous — a crawled confirmation page puts a customer's name, phone number
 * and venue into a public search result, and `noindex` is the only thing
 * standing between those two facts.
 *
 * robots.txt disallows /order/ as well, but the two are not redundant: a
 * disallowed URL can still be indexed from an external link, because Google
 * will list a URL it was told not to fetch. Only the header actually removes it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params

  const result = await getOrderWithMeals(id)
  if (!result) notFound()

  const { order, meals } = result

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Confirmation banner */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
        >
          <svg className="w-7 h-7" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">Request Received</h1>
        <p className="text-[var(--ink-3)]">
          Thank you, <strong>{order.client_name}</strong>. We&rsquo;ve received your catering request
          and will be in touch shortly to confirm availability and pricing. A summary has been sent
          to <strong>{order.client_email}</strong>.
        </p>
        <p className="text-xs text-[var(--ink-3)] font-mono">Ref: #{orderRef(order.id)}</p>
        <a
          href={`/api/orders/${order.id}/pdf`}
          download
          className="btn btn-secondary btn-sm mt-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Download PDF
        </a>
      </div>

      {/* Event summary */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-widest">Event</h2>
        <div>
          <p className="font-semibold text-lg text-[var(--ink)]">{order.event_name}</p>
          <p className="text-[var(--ink-3)] text-sm">
            {EVENT_TYPE_LABELS[order.event_type] ?? order.event_type}
          </p>
        </div>
        <div className="pt-2 border-t border-[var(--line)] text-sm text-[var(--ink-2)] space-y-1">
          <p><span className="text-[var(--ink-3)]">Client: </span>{order.client_name}</p>
          <p><span className="text-[var(--ink-3)]">Email: </span>{order.client_email}</p>
          {!!order.client_phone && (
            <p><span className="text-[var(--ink-3)]">Phone: </span>{order.client_phone}</p>
          )}
        </div>
      </section>

      {/* Meals */}
      {meals.map((meal, i) => (
        <section key={meal.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-widest mb-1">
              Meal {i + 1}
            </p>
            <h3 className="font-semibold text-lg text-[var(--ink)]">{meal.name}</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Date', value: formatDate(meal.date) },
              { label: 'Time', value: formatTime(meal.time) },
              { label: 'Guests', value: `${meal.total_guests} (${meal.veg_guests} veg)` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[var(--ink-3)] mb-1">{label}</p>
                <p className="font-medium text-[var(--ink)]">{value}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-[var(--ink-3)] mb-1">Location</p>
              <p className="font-medium text-[var(--ink)]">{meal.location}</p>
            </div>
          </div>

          {!!meal.dishes?.length && (
            <div className="pt-4 border-t border-[var(--line)]">
              <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-widest mb-3">
                Selected Dishes ({meal.dishes.length})
              </p>
              <ul className="space-y-2">
                {meal.dishes.map(dish => (
                  <li key={dish.id}>
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                      <span className="text-sm text-[var(--ink)]">{dish.name}</span>
                      <span className="text-xs text-[var(--ink-3)] capitalize">{dish.diet}</span>
                    </div>
                    {/* Shown so the customer can confirm the note they wrote
                        actually reached the order, not only the PDF. */}
                    {!!dish.note && (
                      <p className="text-[13px] text-[var(--ink-3)] ml-[18px] mt-0.5">{dish.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {/* Read back to the customer for the same reason the per-dish notes are:
          this page is the record they were sent a link to, and a requirement
          they cannot see here is one they have no way of knowing we hold.
          `whitespace-pre-line` because they typed the line breaks on purpose. */}
      {!!order.notes && (
        <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 space-y-2">
          <h2 className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide">
            Your notes
          </h2>
          <p className="text-[15px] leading-[1.6] text-[var(--ink-2)] whitespace-pre-line">
            {order.notes}
          </p>
        </section>
      )}

      <div className="text-center pt-4 space-y-3">
        <p className="text-sm text-[var(--ink-3)]">
          We&rsquo;ll be in touch soon to confirm the details.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent)' }}
        >
          ← Return to home
        </Link>
      </div>
    </div>
  )
}
