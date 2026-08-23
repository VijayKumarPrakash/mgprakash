'use client'

import { useMemo, useState } from 'react'
import { useOrder } from '../OrderContext'
import { formatDate, formatTime } from '@/lib/format'
import { EVENT_TYPE_LABELS } from '@/types'
import { ORDER_NOTE_MAX, DISH_NOTE_MAX } from '@/lib/validation'
import type { Dish, EventType } from '@/types'

interface Props {
  dishes: Dish[]
  onBack: () => void
  onSubmit: () => Promise<void>
}

export function ReviewStep({ dishes, onBack, onSubmit }: Props) {
  const { draft, setDishNote, setNotes } = useOrder()
  const [submitting, setSubmitting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error, setError] = useState('')

  const dishMap = useMemo(() => new Map(dishes.map(d => [d.id, d])), [dishes])

  async function handleDownloadDraft() {
    setDownloadingPdf(true)
    setError('')
    try {
      // Only the draft goes over the wire. This used to post `dishes` too —
      // the entire 229-dish catalogue, a quarter of a megabyte uploaded from a
      // phone — purely so the server could look up names it can already read
      // from its own database.
      const res = await fetch('/api/orders/draft-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      // The server's own message is surfaced when there is one: a customer told
      // "try again in a few minutes" waits, where one told "try again" retries
      // immediately and hits the same limit.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to generate PDF')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mgprakash-quote-draft.pdf'
      a.click()
      // Revoked on the next frame rather than synchronously — Safari has not
      // started reading the blob by the time click() returns, and revoking
      // immediately cancels the download.
      requestAnimationFrame(() => URL.revokeObjectURL(url))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the draft PDF. Please try again.')
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
        <p className="text-sm text-[var(--ink-2)]">
          {EVENT_TYPE_LABELS[draft.event_type as EventType] ?? draft.event_type}
        </p>
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
              <p>{formatDate(meal.date)}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--ink-3)]">Time</span>
              <p>{formatTime(meal.time)}</p>
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
              <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1">
                Selected dishes ({meal.dish_ids.length})
              </p>
              {/* Notes are collected here rather than in the dish-selection
                  step: that step is the whole 229-card catalogue, and there is
                  nowhere in it to annotate a choice you have already made.
                  This is also the moment the customer is checking the order
                  over, which is when "mild, for the children" occurs to them. */}
              <p className="text-[12px] text-[var(--ink-3)] mb-3">
                Add a note to any dish — spice, portions, substitutions.
              </p>
              <ul className="space-y-3">
                {meal.dish_ids.map(id => (
                  <li key={id}>
                    <div className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                      {dishMap.get(id)?.name ?? id}
                    </div>
                    <input
                      type="text"
                      value={meal.dish_notes[id] ?? ''}
                      onChange={e => setDishNote(meal.id, id, e.target.value)}
                      maxLength={DISH_NOTE_MAX}
                      placeholder="Add a note (optional)"
                      aria-label={`Note for ${dishMap.get(id)?.name ?? id}`}
                      className="form-input mt-1.5 ml-3.5 py-2 text-[13px]"
                      style={{ width: 'calc(100% - 0.875rem)' }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-3)] italic">No dishes selected for this meal</p>
          )}
        </section>
      ))}

      {/* Anything true of the order as a whole rather than of one dish.
          The per-dish inputs above cannot carry "we are a Jain family"
          without the customer typing it against all sixty dishes — and a rule
          stated once is also the form the kitchen wants to read it in. It sits
          last because it is the question you can only answer once you have
          seen the whole order. */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-2">
        <label
          htmlFor="order-notes"
          className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide"
        >
          Anything else for the chef?
        </label>
        <p className="text-[12px] text-[var(--ink-3)]">
          Dietary rules that apply across the menu, allergies, venue access, timings — anything
          we should know. Optional.
        </p>
        <textarea
          id="order-notes"
          value={draft.notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={ORDER_NOTE_MAX}
          rows={4}
          placeholder="We are a Jain family — no onion, garlic or root vegetables. Two guests are allergic to peanuts. The venue gate shuts at 9pm."
          className="form-input w-full resize-y text-[14px] leading-relaxed"
        />
        {/* Only once it is nearly full. A counter sitting at "1000 left" from
            the first render is noise on a field most people leave empty. */}
        {draft.notes.length > ORDER_NOTE_MAX - 200 && (
          <p className="text-[12px] text-[var(--ink-3)] text-right tabular-nums">
            {ORDER_NOTE_MAX - draft.notes.length} characters left
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2 items-center">
        <button type="button" onClick={onBack} disabled={submitting} className="btn btn-secondary">
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadDraft}
            disabled={downloadingPdf || submitting}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {downloadingPdf ? 'Generating…' : 'Download draft'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  )
}
