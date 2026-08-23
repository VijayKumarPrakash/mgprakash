'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { Dish } from '@/types'
import type { OrderContextShape } from './CatalogueClient'
import { DietBadge } from './DietBadge'
import { DishImage } from './DishImage'
import { COURSE_LABELS, OCCASION_LABELS, LICENCES_REQUIRING_CREDIT } from '@/lib/taxonomy'

interface Props {
  dish: Dish
  onClose: () => void
  orderContext?: OrderContextShape
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-1">
        {label}
      </p>
      <p className="text-[14px] text-[var(--ink)]">{value}</p>
    </div>
  )
}

export function DishModal({ dish, onClose, orderContext }: Props) {
  const isSelected = orderContext?.selectedDishIds.includes(dish.id) ?? false
  const hasActiveMeal = !!orderContext?.activeMealId
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [])

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      trapFocus(e)
    }
    document.addEventListener('keydown', onKey)

    // Locking overflow alone shifts the whole page left by the scrollbar width
    // the instant the modal opens. Compensating with padding keeps it still.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      restoreFocus.current?.focus?.()
    }
  }, [onClose, trapFocus])

  const needsCredit =
    dish.image_credit && LICENCES_REQUIRING_CREDIT.includes(dish.image_licence)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
    >
      <div
        className="absolute inset-0 bg-[rgba(20,16,13,.55)] backdrop-blur-[3px] animate-[fadeIn_180ms_ease-out]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full sm:max-w-[560px] max-h-[92vh] sm:max-h-[86vh] flex flex-col
                   bg-[var(--surface)] rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]
                   shadow-[var(--shadow-pop)] overflow-hidden outline-none
                   animate-[panelIn_260ms_cubic-bezier(.22,1,.36,1)]"
      >
        <div className="relative aspect-[16/9] flex-shrink-0 bg-[var(--dark-2)]">
          <DishImage
            id={dish.id}
            name={dish.name}
            course={dish.course}
            src={dish.image_url}
            blurDataUrl={dish.blur_data_url}
            size="feature"
            sizes="(max-width: 640px) 100vw, 560px"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full
                       bg-[rgba(20,16,13,.6)] text-[var(--dark-ink)] backdrop-blur-sm
                       hover:bg-[rgba(20,16,13,.85)] active:scale-95
                       transition-[background-color,transform] duration-[120ms]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 flex flex-col gap-5">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 id="dish-modal-title" className="font-display text-[27px] text-[var(--ink)] text-balance">
                {dish.name}
              </h2>
              <div className="pt-1 flex-shrink-0">
                <DietBadge dish={dish} detailed />
              </div>
            </div>
            {dish.alt_names.length > 0 && (
              <p className="text-[13px] text-[var(--ink-3)] italic">
                Also known as {dish.alt_names.join(', ')}
              </p>
            )}
          </div>

          <p className="text-[15px] leading-[1.65] text-[var(--ink-2)]">{dish.description}</p>

          {/* The modal has no URL, so this is the only way out of it to something
              shareable. Also the internal link that connects the catalogue grid
              to the dish pages for anything crawling with JavaScript on. */}
          <Link
            href={`/menu/${dish.id}`}
            className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]
                       underline underline-offset-2 transition-colors duration-[var(--dur-fast)] -mt-2"
          >
            Open full dish page ↗
          </Link>

          <div className="grid grid-cols-2 gap-x-5 gap-y-4 py-5 border-y border-[var(--line)]">
            <Field label="Course" value={dish.course.map(c => COURSE_LABELS[c]).join(' · ')} />
            <Field label="Cuisine" value={dish.cuisine} />
            <Field
              label="Method"
              value={<span className="capitalize">{dish.cooking_method.join(', ').replace(/-/g, ' ')}</span>}
            />
            {dish.region_of_origin && <Field label="Region" value={dish.region_of_origin} />}
          </div>

          {dish.flavour_profile.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2">
                Flavour
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dish.flavour_profile.map(f => (
                  <span
                    key={f}
                    className="text-[12px] font-medium capitalize rounded-full px-3 py-1
                               bg-[var(--accent-soft)] text-[color-mix(in_srgb,var(--accent)_82%,black)]
                               border border-[var(--accent-line)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dish.ingredients.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2">
                Ingredients
              </p>
              <p className="text-[14px] leading-[1.65] text-[var(--ink-2)] capitalize">
                {dish.ingredients.join(', ')}
              </p>
            </div>
          )}

          {dish.occasion_fit.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2">
                Suits
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dish.occasion_fit.map(o => (
                  <span
                    key={o}
                    className="text-[12px] rounded-full px-3 py-1 bg-[var(--surface-2)] text-[var(--ink-2)]"
                  >
                    {OCCASION_LABELS[o]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CC-BY and CC-BY-SA legally require this line to be visible. */}
          {needsCredit && (
            <p className="text-[11px] text-[var(--ink-3)] pt-1">
              Photograph:{' '}
              {dish.image_source_url ? (
                <a
                  href={dish.image_source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline underline-offset-2 hover:text-[var(--ink-2)] transition-colors"
                >
                  {dish.image_credit}
                </a>
              ) : (
                dish.image_credit
              )}{' '}
              ({dish.image_licence.toUpperCase()})
            </p>
          )}
        </div>

        {orderContext && (
          <div className="flex-shrink-0 p-4 border-t border-[var(--line)] bg-[var(--surface)]">
            {!hasActiveMeal ? (
              <p className="text-[13px] text-[var(--ink-3)] text-center py-2">
                Select a meal before adding dishes
              </p>
            ) : (
              <button
                type="button"
                onClick={() =>
                  isSelected ? orderContext.onRemoveDish(dish.id) : orderContext.onAddDish(dish.id)
                }
                className={`btn w-full ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
              >
                {isSelected
                  ? `Remove from ${orderContext.activeMealName}`
                  : `Add to ${orderContext.activeMealName}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
