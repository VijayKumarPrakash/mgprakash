'use client'

import { useMemo } from 'react'
import { useOrder } from '../OrderContext'
import { SelectionBar } from '../SelectionBar'
import { CatalogueClient } from '@/components/catalogue/CatalogueClient'
import type { Dish } from '@/types'

interface Props {
  dishes: Dish[]
  onNext: () => void
  onBack: () => void
}

export function DishSelectionStep({ dishes, onNext, onBack }: Props) {
  const { draft, activeMeal, setActiveMeal, addDishToMeal, removeDishFromMeal } = useOrder()

  const activeMealId = draft.active_meal_id

  // Memoised because this object is the sole prop that changes on the
  // catalogue. Rebuilt fresh every render, it invalidated the whole 229-card
  // grid on each keystroke of the search box sitting inside it — undoing the
  // deferred-value work CatalogueClient does to stay responsive.
  const orderContext = useMemo(
    () => ({
      activeMealId,
      activeMealName: activeMeal?.name || null,
      selectedDishIds: activeMeal?.dish_ids ?? [],
      onAddDish: (dishId: string) => {
        if (activeMealId) addDishToMeal(activeMealId, dishId)
      },
      onRemoveDish: (dishId: string) => {
        if (activeMealId) removeDishFromMeal(activeMealId, dishId)
      },
    }),
    [activeMealId, activeMeal?.name, activeMeal?.dish_ids, addDishToMeal, removeDishFromMeal]
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Select dishes</h2>
        <p className="text-[var(--ink-3)] mt-1">Choose which dishes to include for each meal.</p>
      </div>

      {/*
        Only shown with more than one meal — with a single meal there is
        nothing to switch between, and the bar below already names it. The
        tray SelectionBar opens carries its own copy of this switcher too,
        which is what actually lets a customer change meals without
        scrolling back up through a 229-dish grid; this one stays for the
        customer who is already at the top of the page.
      */}
      {draft.meals.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
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
              {meal.dish_ids.length > 0 && (
                <span className={`ml-2 text-[11px] rounded-full px-1.5 py-0.5 ${
                  draft.active_meal_id === meal.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                }`}>
                  {meal.dish_ids.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Catalogue */}
      <CatalogueClient dishes={dishes} orderContext={orderContext} />

      {/* Spacer so the last row of cards doesn't sit under the fixed bar. */}
      <div className="h-16" aria-hidden="true" />

      <SelectionBar dishes={dishes} onBack={onBack} onReview={onNext} />
    </div>
  )
}
