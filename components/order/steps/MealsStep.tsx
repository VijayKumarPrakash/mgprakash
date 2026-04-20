'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'
import type { MealDraft } from '@/types'

interface Props {
  onNext: () => void
  onBack: () => void
}

function MealCard({
  meal,
  onRemove,
  onErrors,
}: {
  meal: MealDraft
  onRemove: () => void
  onErrors: (id: string, errors: Record<string, string>) => void
}) {
  const { updateMeal } = useOrder()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const allVeg = !!meal.total_guests && meal.veg_guests === meal.total_guests

  function update(payload: Partial<Omit<MealDraft, 'id' | 'dish_ids'>>) {
    updateMeal(meal.id, payload)
    const clearedKey = Object.keys(payload)[0]
    const next = { ...errors, [clearedKey]: '' }
    setErrors(next)
    onErrors(meal.id, next)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1a1a1a]">Meal details</h3>
        <button
          onClick={onRemove}
          className="text-stone-400 hover:text-red-500 transition-colors text-sm"
        >
          Remove
        </button>
      </div>

      <FormField label="Meal name" error={errors.name} required>
        <input
          type="text"
          value={meal.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="e.g. Reception Dinner"
          className="form-input"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date" error={errors.date} required>
          <input
            type="date"
            value={meal.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => update({ date: e.target.value })}
            className="form-input"
          />
        </FormField>
        <FormField label="Time" error={errors.time} required>
          <input
            type="time"
            value={meal.time}
            step={3600}
            onChange={e => update({ time: e.target.value })}
            className="form-input"
          />
        </FormField>
      </div>

      <FormField label="Location" error={errors.location} required>
        <input
          type="text"
          value={meal.location}
          onChange={e => update({ location: e.target.value })}
          placeholder="Venue name and address"
          className="form-input"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Total guests" error={errors.total_guests} required>
          <input
            type="number"
            min={1}
            value={meal.total_guests}
            onChange={e => update({ total_guests: e.target.value ? parseInt(e.target.value) : '' })}
            onDoubleClick={e => (e.target as HTMLInputElement).select()}
            placeholder="100"
            className="form-input"
          />
        </FormField>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#1a1a1a]">Vegetarian guests</label>
            <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVeg}
                onChange={e => {
                  if (e.target.checked) update({ veg_guests: meal.total_guests })
                  else update({ veg_guests: '' })
                }}
                className="rounded border-stone-300"
              />
              All veg
            </label>
          </div>
          <input
            type="number"
            min={0}
            value={meal.veg_guests}
            disabled={allVeg}
            onChange={e => update({ veg_guests: e.target.value ? parseInt(e.target.value) : '' })}
            onDoubleClick={e => (e.target as HTMLInputElement).select()}
            placeholder="60"
            className={`form-input${allVeg ? ' opacity-60 bg-stone-50 cursor-not-allowed' : ''}`}
          />
          {errors.veg_guests && <p className="text-xs text-red-600">{errors.veg_guests}</p>}
        </div>
      </div>
    </div>
  )
}

export function MealsStep({ onNext, onBack }: Props) {
  const { draft, addMeal, removeMeal } = useOrder()
  const [mealErrors, setMealErrors] = useState<Record<string, Record<string, string>>>({})
  const [topError, setTopError] = useState('')

  function handleMealErrors(id: string, errors: Record<string, string>) {
    setMealErrors(prev => ({ ...prev, [id]: errors }))
  }

  function validate(): boolean {
    if (draft.meals.length === 0) {
      setTopError('Please add at least one meal to continue.')
      return false
    }
    setTopError('')
    const newErrors: Record<string, Record<string, string>> = {}
    let valid = true
    for (const meal of draft.meals) {
      const e: Record<string, string> = {}
      if (!meal.name.trim()) { e.name = 'Meal name is required'; valid = false }
      if (!meal.date) { e.date = 'Date is required'; valid = false }
      if (!meal.time) { e.time = 'Time is required'; valid = false }
      if (!meal.location.trim()) { e.location = 'Location is required'; valid = false }
      if (!meal.total_guests) { e.total_guests = 'Guest count is required'; valid = false }
      newErrors[meal.id] = e
    }
    setMealErrors(newErrors)
    return valid
  }

  function handleNext() {
    if (validate()) onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Add your meals</h2>
        <p className="text-stone-500 mt-1">Each meal can have its own date, time, location, and dish selection.</p>
      </div>

      {topError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{topError}</p>
      )}

      <div className="space-y-4">
        {draft.meals.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            onRemove={() => removeMeal(meal.id)}
            onErrors={handleMealErrors}
          />
        ))}
      </div>

      <button
        onClick={addMeal}
        className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 text-sm font-medium text-stone-500 hover:border-stone-300 hover:text-stone-600 transition-colors"
      >
        + Add a meal
      </button>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">Back</button>
        <button onClick={handleNext} className="btn-primary">Continue to dish selection</button>
      </div>
    </div>
  )
}
