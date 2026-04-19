import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAnonClient } from '@/lib/supabase/server'
import type { Order, Meal, Dish } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = createAnonClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('order_id', id)
    .order('date')

  const mealRows = (meals ?? []) as Meal[]

  // Fetch dishes for each meal
  const { data: mealDishes } = await supabase
    .from('meal_dishes')
    .select('meal_id, dish_id')
    .in('meal_id', mealRows.map(m => m.id))

  const allDishIds = [...new Set((mealDishes ?? []).map(md => md.dish_id))]
  const { data: dishRows } = allDishIds.length
    ? await supabase.from('dishes').select('*').in('id', allDishIds)
    : { data: [] }

  const dishMap = Object.fromEntries((dishRows ?? []).map((d: Dish) => [d.id, d]))

  const mealsWithDishes = mealRows.map(meal => ({
    ...meal,
    dishes: (mealDishes ?? [])
      .filter(md => md.meal_id === meal.id)
      .map(md => dishMap[md.dish_id])
      .filter(Boolean) as Dish[],
  }))

  const o = order as Order

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Confirmation banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2" style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-[#1a1a1a]">Order Confirmed</h1>
        <p className="text-stone-500">
          Thank you, <strong>{o.client_name}</strong>. A confirmation email has been sent to{' '}
          <strong>{o.client_email}</strong> with a PDF summary attached.
        </p>
        <p className="text-xs text-stone-400 font-mono">
          Ref: #{o.id.slice(0, 8).toUpperCase()}
        </p>
        <a
          href={`/api/orders/${o.id}/pdf`}
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-stone-200 text-sm font-medium text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-colors bg-white mt-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Download PDF
        </a>
      </div>

      {/* Event summary */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Event</h2>
        <div>
          <p className="font-semibold text-lg text-[#1a1a1a]">{o.event_name}</p>
          <p className="text-stone-500 capitalize text-sm">{o.event_type}</p>
        </div>
        <div className="pt-2 border-t border-stone-100 text-sm text-stone-600 space-y-1">
          <p><span className="text-stone-400">Client: </span>{o.client_name}</p>
          <p><span className="text-stone-400">Email: </span>{o.client_email}</p>
          <p><span className="text-stone-400">Phone: </span>{o.client_phone}</p>
        </div>
      </section>

      {/* Meals */}
      {mealsWithDishes.map((meal, i) => (
        <section key={meal.id} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Meal {i + 1}</p>
            <h3 className="font-semibold text-lg text-[#1a1a1a]">{meal.name}</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Date', value: new Date(meal.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Time', value: meal.time },
              { label: 'Guests', value: `${meal.total_guests} (${meal.veg_guests} veg)` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-stone-400 mb-1">{label}</p>
                <p className="font-medium text-[#1a1a1a]">{value}</p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-stone-400 mb-1">Location</p>
              <p className="font-medium text-[#1a1a1a]">{meal.location}</p>
            </div>
          </div>

          {meal.dishes.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
                Selected Dishes ({meal.dishes.length})
              </p>
              <ul className="space-y-2">
                {meal.dishes.map(dish => (
                  <li key={dish.id} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-accent)' }} />
                    <span className="text-sm text-[#1a1a1a]">{dish.name}</span>
                    <span className="text-xs text-stone-400 capitalize">{dish.diet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      <div className="text-center pt-4 space-y-3">
        <p className="text-sm text-stone-500">
          We'll be in touch soon to confirm the details.
        </p>
        <Link href="/" className="inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--color-accent)' }}>
          ← Return to home
        </Link>
      </div>
    </div>
  )
}
