'use client'

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

  const orderContext = {
    activeMealId: draft.active_meal_id,
    activeMealName: activeMeal?.name || null,
    selectedDishIds: activeMeal?.dish_ids ?? [],
    onAddDish: (dishId: string) => {
      if (draft.active_meal_id) addDishToMeal(draft.active_meal_id, dishId)
    },
    onRemoveDish: (dishId: string) => {
      if (draft.active_meal_id) removeDishFromMeal(draft.active_meal_id, dishId)
    },
  }

  const totalDishesSelected = draft.meals.reduce((sum, m) => sum + m.dish_ids.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Select dishes</h2>
        <p className="text-stone-500 mt-1">Choose which dishes to include for each meal.</p>
      </div>

      {/* Meal switcher */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Active meal</p>
        <div className="flex flex-wrap gap-2">
          {draft.meals.map(meal => (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                draft.active_meal_id === meal.id
                  ? 'text-white border-transparent'
                  : 'text-stone-600 border-stone-200 hover:border-stone-300 bg-white'
              }`}
              style={draft.active_meal_id === meal.id ? { background: 'var(--color-accent)' } : {}}
            >
              {meal.name || 'Unnamed meal'}
              {meal.dish_ids.length > 0 && (
                <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${
                  draft.active_meal_id === meal.id
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}>
                  {meal.dish_ids.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeMeal && (
          <p className="text-xs text-stone-400 mt-3">
            Adding dishes to <span className="font-medium text-stone-600">{activeMeal.name || 'this meal'}</span>
            {activeMeal.dish_ids.length > 0 && ` · ${activeMeal.dish_ids.length} selected`}
          </p>
        )}
      </div>

      {/* Catalogue */}
      <CatalogueClient dishes={dishes} orderContext={orderContext} />

      <div className="flex justify-between items-center pt-2 border-t border-stone-100">
        <button onClick={onBack} className="btn-secondary">Back</button>
        <div className="flex items-center gap-4">
          {totalDishesSelected > 0 && (
            <p className="text-sm text-stone-500">
              {totalDishesSelected} dish{totalDishesSelected !== 1 ? 'es' : ''} selected across all meals
            </p>
          )}
          <button onClick={onNext} className="btn-primary">
            Review order
          </button>
        </div>
      </div>
    </div>
  )
}
