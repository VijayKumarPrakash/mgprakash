'use client'

import { useState, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import type { Dish, Course, Diet } from '@/types'
import { DishCard } from './DishCard'
import { DishModal } from './DishModal'
import { SearchBar } from './SearchBar'
import { FilterPanel } from './FilterPanel'

const PAGE_SIZE = 6

export interface CatalogueFilters {
  course: Course | ''
  cuisine: string
  diet: Diet | ''
  spice_level: string
  occasion_fit: string
}

const EMPTY_FILTERS: CatalogueFilters = {
  course: '',
  cuisine: '',
  diet: '',
  spice_level: '',
  occasion_fit: '',
}

interface Props {
  dishes: Dish[]
  /** When provided, renders "Add to menu" buttons tied to the order flow */
  orderContext?: {
    activeMealId: string | null
    activeMealName: string | null
    selectedDishIds: string[]
    onAddDish: (dishId: string) => void
    onRemoveDish: (dishId: string) => void
  }
}

export function CatalogueClient({ dishes, orderContext }: Props) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [modalDish, setModalDish] = useState<Dish | null>(null)

  const fuse = useMemo(
    () =>
      new Fuse(dishes, {
        keys: ['name', 'description', 'tags', 'ingredients'],
        threshold: 0.35,
        includeScore: true,
      }),
    [dishes]
  )

  const filtered = useMemo(() => {
    let results: Dish[] = query.trim()
      ? fuse.search(query.trim()).map(r => r.item)
      : dishes

    if (filters.course) {
      results = results.filter(d => d.course.includes(filters.course as Course))
    }
    if (filters.cuisine) {
      results = results.filter(d =>
        d.cuisine?.toLowerCase() === filters.cuisine.toLowerCase()
      )
    }
    if (filters.diet) {
      results = results.filter(d => d.diet === filters.diet)
    }
    if (filters.spice_level) {
      results = results.filter(d => d.spice_level === filters.spice_level)
    }
    if (filters.occasion_fit) {
      results = results.filter(d =>
        d.occasion_fit.includes(filters.occasion_fit)
      )
    }

    return results
  }, [query, filters, dishes, fuse])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setQuery('')
    setPage(1)
  }, [])

  const handleFilterChange = useCallback((next: Partial<CatalogueFilters>) => {
    setFilters(prev => ({ ...prev, ...next }))
    setPage(1)
  }, [])

  const hasActiveFilters =
    query.trim() || Object.values(filters).some(v => v !== '')

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <SearchBar value={query} onChange={v => { setQuery(v); setPage(1) }} />
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-stone-500 hover:text-[#1a1a1a] transition-colors underline underline-offset-2 whitespace-nowrap"
            >
              Clear all filters
            </button>
          )}
        </div>

        <FilterPanel dishes={dishes} filters={filters} onChange={handleFilterChange} />

        <p className="text-sm text-stone-400">
          {filtered.length === dishes.length
            ? `${dishes.length} dishes`
            : `${filtered.length} of ${dishes.length} dishes`}
        </p>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-stone-400">
            <p className="text-lg mb-2">No dishes found</p>
            <button onClick={clearFilters} className="text-sm underline underline-offset-2 hover:text-[#1a1a1a] transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map(dish => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  onViewDetails={() => setModalDish(dish)}
                  orderContext={orderContext}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 rounded-full border border-stone-300 text-sm font-medium text-[#1a1a1a] hover:border-stone-400 hover:bg-stone-50 transition-colors"
                >
                  Load more ({filtered.length - visible.length} remaining)
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
