'use client'

import { useMemo, useState } from 'react'
import { useOrder } from './OrderContext'
import { useDialog } from '../useDialog'
import { COURSES, COURSE_LABELS } from '@/lib/taxonomy'
import type { Dish } from '@/types'

interface Props {
  dishes: Dish[]
  onBack: () => void
  onReview: () => void
}

/**
 * Orientation for the dish-selection step, which used to end with a single
 * Back/Review row below whatever card happened to be last — meaning
 * switching meals meant scrolling back to the top, and checking what was
 * already picked meant scrolling all the way forward to Review. This bar is
 * pinned to the bottom of the viewport for the whole step: it always shows
 * the active meal and a running count, and tapping it opens a tray of what's
 * on that meal without leaving the catalogue.
 */
export function SelectionBar({ dishes, onBack, onReview }: Props) {
  const { draft, activeMeal } = useOrder()
  const [trayOpen, setTrayOpen] = useState(false)

  const activeCount = activeMeal?.dish_ids.length ?? 0
  const totalCount = draft.meals.reduce((sum, m) => sum + m.dish_ids.length, 0)

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]"
        style={{
          boxShadow: '0 -14px 40px -10px rgba(35,25,15,.18), 0 -2px 8px rgba(28,26,23,.05)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full text-[var(--ink-2)]
                       hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)]"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
              <path d="M6 1L1 6M1 6L6 11M1 6H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            disabled={draft.meals.length === 0}
            aria-haspopup="dialog"
            className="flex-1 min-w-0 flex items-center justify-between gap-2 h-11 px-4 rounded-[var(--r-pill)]
                       bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors duration-[var(--dur-fast)]
                       text-left disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-[var(--ink)] truncate">
                {activeMeal?.name || 'Select a meal'}
              </span>
              <span className="block text-[11.5px] text-[var(--ink-3)] truncate">
                {activeCount} dish{activeCount !== 1 ? 'es' : ''} for this meal
                {draft.meals.length > 1 && ` · ${totalCount} total`}
              </span>
            </span>
            <svg width="11" height="7" viewBox="0 0 11 7" fill="none" className="flex-shrink-0" aria-hidden="true">
              <path d="M1 6L5.5 1.5L10 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <button type="button" onClick={onReview} className="btn btn-primary btn-sm flex-shrink-0">
            Review
          </button>
        </div>
      </div>

      {trayOpen && <SelectionTray dishes={dishes} onClose={() => setTrayOpen(false)} />}
    </>
  )
}

function SelectionTray({ dishes, onClose }: { dishes: Dish[]; onClose: () => void }) {
  const { draft, activeMeal, setActiveMeal, removeDishFromMeal } = useOrder()
  const panelRef = useDialog(onClose)

  const dishMap = useMemo(() => new Map(dishes.map(d => [d.id, d])), [dishes])

  // Grouped in COURSES order — menu-service order, same as the PDF and the
  // order summary — rather than selection order, so a customer scanning the
  // tray for "did I add a rice dish" finds it where they'd expect it.
  const grouped = useMemo(() => {
    if (!activeMeal) return []
    return COURSES.map(course => ({
      course,
      label: COURSE_LABELS[course],
      items: activeMeal.dish_ids
        .map(id => dishMap.get(id))
        .filter((d): d is Dish => !!d && d.course[0] === course),
    })).filter(g => g.items.length > 0)
  }, [activeMeal, dishMap])

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selection-tray-title"
    >
      <div
        className="absolute inset-0 bg-[rgba(20,16,13,.55)] backdrop-blur-[3px] animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full sm:max-w-[560px] max-h-[70vh] flex flex-col
                   bg-[var(--surface)] rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]
                   shadow-[var(--shadow-pop)] overflow-hidden outline-none
                   animate-[panelIn_260ms_cubic-bezier(.22,1,.36,1)]"
        style={{ marginBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex-shrink-0 p-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <h2 id="selection-tray-title" className="font-display text-[19px] text-[var(--ink)]">
            Your selection
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-full text-[var(--ink-3)]
                       hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)]"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* The tray carries its own meal switcher rather than relying on the
            one at the top of the step — this is what lets a customer change
            meals without scrolling back to the top of a 229-dish grid. */}
        {draft.meals.length > 1 && (
          <div className="flex-shrink-0 px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-none">
            {draft.meals.map(meal => (
              <button
                key={meal.id}
                type="button"
                onClick={() => setActiveMeal(meal.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-[var(--r-pill)] text-[13px] font-medium
                           transition-colors duration-[var(--dur-fast)] border ${
                  draft.active_meal_id === meal.id
                    ? 'text-white border-transparent'
                    : 'text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--line-strong)] bg-[var(--surface)]'
                }`}
                style={draft.active_meal_id === meal.id ? { background: 'var(--accent)' } : undefined}
              >
                {meal.name || 'Unnamed meal'}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {grouped.length > 0 ? (
            <div className="space-y-5">
              {grouped.map(g => (
                <div key={g.course}>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2">
                    {g.label}
                  </p>
                  <ul className="space-y-1">
                    {g.items.map(d => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-1">
                        <span className="text-[14px] text-[var(--ink)] truncate">{d.name}</span>
                        <button
                          type="button"
                          onClick={() => activeMeal && removeDishFromMeal(activeMeal.id, d.id)}
                          aria-label={`Remove ${d.name}`}
                          className="flex-shrink-0 w-7 h-7 grid place-items-center rounded-full text-[var(--ink-3)]
                                     hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]
                                     transition-colors duration-[var(--dur-fast)]"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-3)] text-center py-10">
              No dishes selected yet for this meal.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
