'use client'

import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue, useTransition } from 'react'
import Fuse from 'fuse.js'
import type { Dish } from '@/types'
import { COURSES, CUISINE_GROUPS, OCCASIONS, COURSE_LABELS, OCCASION_LABELS } from '@/lib/taxonomy'
import type { Course, CuisineGroup, Occasion } from '@/lib/taxonomy'
import { DishCard } from './DishCard'
import { DishModal } from './DishModal'
import { SearchBar } from './SearchBar'
import { FilterPanel, DIET_OPTIONS } from './FilterPanel'

const PAGE_SIZE = 12

export interface CatalogueFilters {
  course: Course[]
  cuisine_group: CuisineGroup[]
  occasion: Occasion[]
  diet: ('vegetarian' | 'non-vegetarian' | 'vegan')[]
}

export const EMPTY_FILTERS: CatalogueFilters = {
  course: [], cuisine_group: [], occasion: [], diet: [],
}

export interface OrderContextShape {
  activeMealId: string | null
  activeMealName: string | null
  selectedDishIds: string[]
  onAddDish: (dishId: string) => void
  onRemoveDish: (dishId: string) => void
}

interface Props {
  dishes: Dish[]
  orderContext?: OrderContextShape
  /**
   * Seeds the search box from `?q=` on /menu.
   *
   * Deliberately an initial value and not a controlled mirror of the URL: the
   * search input is on the interactive path and pushing a history entry per
   * keystroke would both flood the back button and re-render the tree at
   * exactly the priority `useDeferredValue` exists to protect. Reading it once
   * is enough to make a shared or linked search land on real results, which is
   * the whole point — it is also the URL the WebSite SearchAction in
   * `lib/seo.ts` advertises, so it has to actually work.
   */
  initialQuery?: string
}

export function CatalogueClient({ dishes, orderContext, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [modalDish, setModalDish] = useState<Dish | null>(null)

  /**
   * Two-tier concurrency, because the two inputs fail differently.
   *
   * `useDeferredValue` on the search string: typing updates the <input> at
   * interactive priority every keystroke, while the ~230-dish Fuse pass runs
   * against a lagging copy at low priority. The caret never stutters.
   *
   * `useTransition` on the chips: a chip has to latch instantly to feel
   * physical, but the re-filter behind it is interruptible. `isPending` just
   * dims the grid — React keeps the previous results painted rather than
   * blanking the page, so there is no flash of empty state.
   */
  const deferredQuery = useDeferredValue(query)
  const [isPending, startTransition] = useTransition()

  const fuse = useMemo(
    () =>
      new Fuse(dishes, {
        keys: [
          { name: 'name', weight: 3 },
          { name: 'alt_names', weight: 2 },
          { name: 'cuisine', weight: 1.5 },
          { name: 'tags', weight: 1 },
          { name: 'ingredients', weight: 1 },
          { name: 'description', weight: 0.6 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [dishes]
  )

  const filtered = useMemo(() => {
    const q = deferredQuery.trim()
    let results: Dish[] = q ? fuse.search(q).map(r => r.item) : dishes

    // AND across filter groups, OR within a group — the behaviour people expect
    // from faceted search: "starter OR main" AND "South Indian" AND "vegan".
    if (filters.course.length)
      results = results.filter(d => d.course.some(c => filters.course.includes(c)))
    if (filters.cuisine_group.length)
      results = results.filter(d => filters.cuisine_group.includes(d.cuisine_group))
    if (filters.occasion.length)
      results = results.filter(d => d.occasion_fit.some(o => filters.occasion.includes(o)))
    if (filters.diet.length) {
      results = results.filter(d =>
        filters.diet.every(f =>
          f === 'vegetarian' ? d.diet === 'vegetarian'
          : f === 'non-vegetarian' ? d.diet === 'non-vegetarian'
          : d.is_vegan
        )
      )
    }

    // No re-sort: with a query, Fuse has already ordered by relevance; without
    // one, `dishes` arrives pre-sorted into BROWSE_ORDER by lib/dishes.ts.
    return results
  }, [deferredQuery, filters, dishes, fuse])

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = visible.length < filtered.length

  const clearAll = useCallback(() => {
    startTransition(() => {
      setFilters(EMPTY_FILTERS)
      setQuery('')
      setPage(1)
    })
  }, [])

  const toggleFilter = useCallback(
    <K extends keyof CatalogueFilters>(group: K, value: CatalogueFilters[K][number]) => {
      startTransition(() => {
        setFilters(prev => {
          const list = prev[group] as unknown as string[]
          const next = list.includes(value as string)
            ? list.filter(v => v !== value)
            : [...list, value as string]
          return { ...prev, [group]: next } as CatalogueFilters
        })
        setPage(1)
      })
    },
    []
  )

  const handleQuery = useCallback((v: string) => {
    setQuery(v)          // urgent — the input must never lag
    setPage(1)
  }, [])

  const activeCount =
    Object.values(filters).reduce((n, list) => n + list.length, 0) + (query.trim() ? 1 : 0)

  // One removable pill per active filter (plus the search term), so what's
  // narrowing the list is stated in one line instead of inferred from which
  // chips happen to be latched further up a tall filter panel.
  const activePills = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = []
    if (query.trim()) {
      pills.push({ key: 'query', label: `“${query.trim()}”`, onRemove: () => handleQuery('') })
    }
    for (const c of filters.course) {
      pills.push({ key: `course-${c}`, label: COURSE_LABELS[c], onRemove: () => toggleFilter('course', c) })
    }
    for (const c of filters.cuisine_group) {
      pills.push({ key: `cuisine-${c}`, label: c, onRemove: () => toggleFilter('cuisine_group', c) })
    }
    for (const o of filters.occasion) {
      pills.push({ key: `occasion-${o}`, label: OCCASION_LABELS[o], onRemove: () => toggleFilter('occasion', o) })
    }
    for (const d of filters.diet) {
      const label = DIET_OPTIONS.find(o => o.value === d)?.label ?? d
      pills.push({ key: `diet-${d}`, label, onRemove: () => toggleFilter('diet', d) })
    }
    return pills
  }, [query, filters, handleQuery, toggleFilter])

  /**
   * Sticky recap of search + filter count, shown once the real search box and
   * chips scroll out from under the header. Suppressed entirely on the
   * dish-selection step (orderContext present) — that step already has
   * SelectionBar pinned to the bottom of the viewport, and a bar at each end
   * sandwiching the grid is worse than either alone.
   *
   * An IntersectionObserver on a sentinel below the filter panel, rather than
   * a scroll listener: it reports only on the transition, not on every pixel
   * scrolled, and never touches layout to do it. rootMargin pulls the
   * observed viewport up by the 68px sticky nav height, so the bar appears
   * exactly when the panel would otherwise be hidden under it, not merely
   * when it crosses the physical top of the window.
   */
  const filtersTopRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stickyVisible, setStickyVisible] = useState(false)

  useEffect(() => {
    if (orderContext) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: '-68px 0px 0px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [orderContext])

  return (
    <>
      {!orderContext && (
        <div
          aria-hidden={!stickyVisible}
          className={`fixed inset-x-0 top-[68px] z-20 border-b border-[var(--line)]
                     bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur-md
                     transition-[opacity,transform] duration-[var(--dur-base)] ease-[cubic-bezier(.22,1,.36,1)] ${
            stickyVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-3)]"
                width="14" height="14" viewBox="0 0 16 16" fill="none"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={e => handleQuery(e.target.value)}
                placeholder="Search dishes…"
                // Distinct from SearchBar's own label — both inputs can be
                // in the DOM (and, once this bar is visible, both focusable)
                // at once, and two controls sharing one accessible name is
                // ambiguous for anyone navigating by label.
                aria-label="Search the dish catalogue (sticky)"
                tabIndex={stickyVisible ? 0 : -1}
                className="form-input pl-9 pr-3 py-2 text-[13.5px]"
              />
            </div>
            <button
              type="button"
              tabIndex={stickyVisible ? 0 : -1}
              onClick={() => filtersTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="btn btn-secondary btn-sm flex-shrink-0"
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            {activeCount > 0 && (
              <button
                type="button"
                tabIndex={stickyVisible ? 0 : -1}
                onClick={clearAll}
                className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-[var(--dur-fast)] flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div ref={filtersTopRef} className="flex flex-col gap-5">
          <SearchBar value={query} onChange={handleQuery} />

          <FilterPanel
            filters={filters}
            onToggle={toggleFilter}
            onClear={clearAll}
            activeCount={activeCount}
            courses={COURSES}
            cuisineGroups={CUISINE_GROUPS}
            occasions={OCCASIONS}
          />
        </div>

        {/* Zero-height — purely what the observer above watches. */}
        <div ref={sentinelRef} aria-hidden="true" />

        {activePills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {activePills.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={p.onRemove}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium rounded-full pl-3 pr-2.5 py-1.5
                           bg-[var(--accent-soft)] text-[color-mix(in_srgb,var(--accent)_82%,black)]
                           hover:bg-[var(--accent-line)] transition-colors duration-[var(--dur-fast)]"
              >
                {p.label}
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                  <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[12.5px] font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors duration-[var(--dur-fast)] ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        <p className="text-[13px] text-[var(--ink-3)] tabular-nums" aria-live="polite">
          {filtered.length === dishes.length
            ? `${dishes.length} dishes`
            : `${filtered.length} of ${dishes.length} dishes`}
        </p>

        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl text-[var(--ink)] mb-2">Nothing matches that</p>
            <p className="text-sm text-[var(--ink-3)] mb-6">
              Try removing a filter, or search for an ingredient like paneer, rice or coconut.
            </p>
            <button onClick={clearAll} className="btn btn-secondary btn-sm">
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* aria-busy while a transition is pending, so a screen reader is
                told the results are stale — the spoken equivalent of the dim. */}
            <div
              aria-busy={isPending}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${isPending ? 'is-pending' : ''}`}
            >
              {visible.map((dish, i) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  // Only the first screenful is eager; everything else defers,
                  // so a 229-dish catalogue does not open 229 connections.
                  priority={i < 3}
                  onViewDetails={() => setModalDish(dish)}
                  orderContext={orderContext}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-6">
                <button onClick={() => setPage(p => p + 1)} className="btn btn-secondary">
                  Load more
                  <span className="text-[var(--ink-3)] tabular-nums">
                    {filtered.length - visible.length} left
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalDish && (
        <DishModal
          dish={modalDish}
          onClose={() => setModalDish(null)}
          orderContext={orderContext}
        />
      )}
    </>
  )
}
