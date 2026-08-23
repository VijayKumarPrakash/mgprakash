'use client'

import { useState } from 'react'
import type { CatalogueFilters } from './CatalogueClient'
import { COURSE_LABELS, OCCASION_LABELS } from '@/lib/taxonomy'
import type { Course, CuisineGroup, Occasion } from '@/lib/taxonomy'

interface Props {
  filters: CatalogueFilters
  onToggle: <K extends keyof CatalogueFilters>(group: K, value: CatalogueFilters[K][number]) => void
  onClear: () => void
  activeCount: number
  courses: readonly Course[]
  cuisineGroups: readonly CuisineGroup[]
  occasions: readonly Occasion[]
}

const DIET_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'non-vegetarian', label: 'Non-veg' },
  { value: 'vegan', label: 'Vegan' },
] as const

function Row({
  label, children, count,
}: { label: string; children: React.ReactNode; count: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--ink-3)]">
          {label}
        </span>
        {count > 0 && (
          <span className="text-[10px] font-bold tabular-nums rounded-full w-[17px] h-[17px] grid place-items-center bg-[var(--accent)] text-white">
            {count}
          </span>
        )}
      </div>
      {/* Horizontal scroll on mobile beats wrapping to five lines. */}
      <div className="flex gap-2 flex-wrap max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:scrollbar-none max-sm:-mx-4 max-sm:px-4 max-sm:pb-1">
        {children}
      </div>
    </div>
  )
}

export function FilterPanel({
  filters, onToggle, onClear, activeCount,
  courses, cuisineGroups, occasions,
}: Props) {
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <Row label="Course" count={filters.course.length}>
        {courses.map(c => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={filters.course.includes(c)}
            onClick={() => onToggle('course', c)}
          >
            {COURSE_LABELS[c]}
          </button>
        ))}
      </Row>

      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Cuisine" count={filters.cuisine_group.length}>
          {cuisineGroups.map(c => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={filters.cuisine_group.includes(c)}
              onClick={() => onToggle('cuisine_group', c)}
            >
              {c}
            </button>
          ))}
        </Row>

        <Row label="Diet" count={filters.diet.length}>
          {DIET_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              className="chip"
              aria-pressed={filters.diet.includes(o.value)}
              onClick={() => onToggle('diet', o.value)}
            >
              {o.label}
            </button>
          ))}
        </Row>
      </div>

      {showAll && (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">

          <Row label="Occasion" count={filters.occasion.length}>
            {occasions.map(o => (
              <button
                key={o}
                type="button"
                className="chip"
                aria-pressed={filters.occasion.includes(o)}
                onClick={() => onToggle('occasion', o)}
              >
                {OCCASION_LABELS[o]}
              </button>
            ))}
          </Row>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="text-[13px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors inline-flex items-center gap-1.5"
        >
          {showAll ? 'Fewer filters' : 'Occasion'}
          <svg
            width="11" height="7" viewBox="0 0 11 7" fill="none"
            className="transition-transform duration-200"
            style={{ transform: showAll ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M1 1L5.5 5.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>
    </div>
  )
}
