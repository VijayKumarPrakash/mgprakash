'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import type { Dish } from '@/types'

interface Props {
  dishes: Dish[]
  onBack: () => void
  onSubmit: () => Promise<void>
}

export function ReviewStep({ dishes, onBack, onSubmit }: Props) {
  const { draft } = useOrder()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const dishMap = Object.fromEntries(dishes.map(d => [d.id, d]))

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await onSubmit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Review your order</h2>
        <p className="text-stone-500 mt-1">Please check everything before submitting.</p>
      </div>

      {/* Contact */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Contact</h3>
        <p className="font-semibold text-[#1a1a1a]">{draft.client_name}</p>
        <p className="text-sm text-stone-600">{draft.client_email}</p>
        <p className="text-sm text-stone-600">{draft.client_phone}</p>
      </section>

      {/* Event */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Event</h3>
        <p className="font-semibold text-[#1a1a1a]">{draft.event_name}</p>
        <p className="text-sm text-stone-600 capitalize">{draft.event_type}</p>
      </section>

      {/* Meals */}
      {draft.meals.map((meal, i) => (
        <section key={meal.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Meal {i + 1}</h3>
            <p className="font-semibold text-[#1a1a1a]">{meal.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-stone-600">
            <div>
              <span className="text-xs text-stone-400">Date</span>
              <p>{new Date(meal.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <span className="text-xs text-stone-400">Time</span>
              <p>{meal.time}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-stone-400">Location</span>
              <p>{meal.location}</p>
            </div>
            <div>
              <span className="text-xs text-stone-400">Total guests</span>
              <p>{meal.total_guests}</p>
            </div>
            {meal.veg_guests !== '' && (
              <div>
                <span className="text-xs text-stone-400">Vegetarian guests</span>
                <p>{meal.veg_guests}</p>
              </div>
            )}
          </div>

          {meal.dish_ids.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                Selected dishes ({meal.dish_ids.length})
              </p>
              <ul className="space-y-1">
                {meal.dish_ids.map(id => (
                  <li key={id} className="flex items-center gap-2 text-sm text-stone-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                    {dishMap[id]?.name ?? id}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic">No dishes selected for this meal</p>
          )}
        </section>
      ))}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={submitting} className="btn-secondary disabled:opacity-50">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary disabled:opacity-60 flex items-center gap-2"
        >
          {submitting && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitting ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
    </div>
  )
}
