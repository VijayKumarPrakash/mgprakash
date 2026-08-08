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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error, setError] = useState('')

  const dishMap = Object.fromEntries(dishes.map(d => [d.id, d]))

  async function handleDownloadDraft() {
    setDownloadingPdf(true)
    try {
      const res = await fetch('/api/orders/draft-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, dishes }),
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quote-draft.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not generate draft PDF. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

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
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Review your order</h2>
        <p className="text-[var(--ink-3)] mt-1">Please check everything before submitting.</p>
      </div>

      {/* Contact */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide">Contact</h3>
        <p className="font-semibold text-[var(--ink)]">{draft.client_name}</p>
        <p className="text-sm text-[var(--ink-2)]">{draft.client_email}</p>
        <p className="text-sm text-[var(--ink-2)]">{draft.client_phone}</p>
      </section>

      {/* Event */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide">Event</h3>
        <p className="font-semibold text-[var(--ink)]">{draft.event_name}</p>
        <p className="text-sm text-[var(--ink-2)] capitalize">{draft.event_type}</p>
      </section>

      {/* Meals */}
      {draft.meals.map((meal, i) => (
        <section key={meal.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1">Meal {i + 1}</h3>
            <p className="font-semibold text-[var(--ink)]">{meal.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-[var(--ink-2)]">
            <div>
              <span className="text-xs text-[var(--ink-3)]">Date</span>
              <p>{new Date(meal.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--ink-3)]">Time</span>
              <p>{meal.time}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[var(--ink-3)]">Location</span>
              <p>{meal.location}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--ink-3)]">Total guests</span>
              <p>{meal.total_guests}</p>
            </div>
            {meal.veg_guests !== '' && (
              <div>
                <span className="text-xs text-[var(--ink-3)]">Vegetarian guests</span>
                <p>{meal.veg_guests}</p>
              </div>
            )}
          </div>

          {meal.dish_ids.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-2">
                Selected dishes ({meal.dish_ids.length})
              </p>
              <ul className="space-y-1">
                {meal.dish_ids.map(id => (
                  <li key={id} className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                    {dishMap[id]?.name ?? id}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-3)] italic">No dishes selected for this meal</p>
          )}
        </section>
      ))}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex justify-between pt-2 items-center">
        <button onClick={onBack} disabled={submitting} className="btn-secondary disabled:opacity-50">
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadDraft}
            disabled={downloadingPdf || submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--line)] text-sm font-medium text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)] transition-colors bg-[var(--surface)] disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {downloadingPdf ? 'Generating…' : 'Download Draft'}
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
    </div>
  )
}
