'use client'

import { useMemo } from 'react'
import { useOrder } from '../OrderContext'
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

  const totalDishesSelected = draft.meals.reduce((sum, m) => sum + m.dish_ids.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Select dishes</h2>
        <p className="text-[var(--ink-3)] mt-1">Choose which dishes to include for each meal.</p>
      </div>

      {/* Meal switcher */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4">
        <p className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-3">Active meal</p>
        <div className="flex flex-wrap gap-2">
          {draft.meals.map(meal => (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                draft.active_meal_id === meal.id
                  ? 'text-white border-transparent'
                  : 'text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--line-strong)] bg-[var(--surface)]'
              }`}
              style={draft.active_meal_id === meal.id ? { background: 'var(--accent)' } : {}}
            >
              {meal.name || 'Unnamed meal'}
              {meal.dish_ids.length > 0 && (
                <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${
                  draft.active_meal_id === meal.id
                    ? 'bg-[var(--surface)]/20 text-white'
                    : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                }`}>
                  {meal.dish_ids.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeMeal && (
          <p className="text-xs text-[var(--ink-3)] mt-3">
            Adding dishes to <span className="font-medium text-[var(--ink-2)]">{activeMeal.name || 'this meal'}</span>
            {activeMeal.dish_ids.length > 0 && ` · ${activeMeal.dish_ids.length} selected`}
          </p>
        )}
      </div>

      {/* Catalogue */}
      <CatalogueClient dishes={dishes} orderContext={orderContext} />

      <div className="flex justify-between items-center pt-2 border-t border-[var(--line)]">
        <button onClick={onBack} className="btn btn-secondary">Back</button>
        <div className="flex items-center gap-4">
          {totalDishesSelected > 0 && (
            <p className="text-sm text-[var(--ink-3)]">
              {totalDishesSelected} dish{totalDishesSelected !== 1 ? 'es' : ''} selected across all meals
            </p>
          )}
          <button onClick={onNext} className="btn btn-primary">
            Review order
          </button>
        </div>
      </div>
    </div>
  )
}
