'use client'

import { useState, useMemo, useCallback, useDeferredValue, useTransition } from 'react'
import Fuse from 'fuse.js'
import type { Dish } from '@/types'
import { COURSES, CUISINE_GROUPS, OCCASIONS, SPICE_LEVELS } from '@/lib/taxonomy'
import type { Course, CuisineGroup, Occasion, SpiceLevel } from '@/lib/taxonomy'
import { DishCard } from './DishCard'
import { DishModal } from './DishModal'
import { SearchBar } from './SearchBar'
import { FilterPanel } from './FilterPanel'

const PAGE_SIZE = 12

export interface CatalogueFilters {
  course: Course[]
  cuisine_group: CuisineGroup[]
  occasion: Occasion[]
  spice_level: SpiceLevel[]
  diet: ('vegetarian' | 'non-vegetarian' | 'vegan' | 'jain' | 'no-onion-garlic')[]
}

export const EMPTY_FILTERS: CatalogueFilters = {
  course: [], cuisine_group: [], occasion: [], spice_level: [], diet: [],
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
    if (filters.spice_level.length)
      results = results.filter(d => filters.spice_level.includes(d.spice_level))
    if (filters.diet.length) {
      results = results.filter(d =>
        filters.diet.every(f =>
          f === 'vegetarian' ? d.diet === 'vegetarian'
          : f === 'non-vegetarian' ? d.diet === 'non-vegetarian'
          : f === 'vegan' ? d.is_vegan
          : f === 'jain' ? d.is_jain
          : !d.contains_onion_garlic
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

  return (
    <>
      <div className="flex flex-col gap-5">
        <SearchBar value={query} onChange={handleQuery} />

        <FilterPanel
          filters={filters}
          onToggle={toggleFilter}
          onClear={clearAll}
          activeCount={activeCount}
          courses={COURSES}
          cuisineGroups={CUISINE_GROUPS}
          occasions={OCCASIONS}
          spiceLevels={SPICE_LEVELS}
        />

        <p className="text-[13px] text-[var(--ink-3)] tabular-nums" aria-live="polite">
          {filtered.length === dishes.length
            ? `${dishes.length} dishes`
            : `${filtered.length} of ${dishes.length} dishes`}
        </p>

        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl text-[var(--ink)] mb-2">Nothing matches that</p>
            <p className="text-sm text-[var(--ink-3)] mb-6">
              Try removing a filter, or search for an ingredient instead.
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
