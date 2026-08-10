'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'
import type { MealDraft } from '@/types'

interface Props {
  onNext: () => void
  onBack: () => void
}

type FieldErrors = Record<string, string>

function MealCard({
  meal,
  index,
  errors,
  onRemove,
  onClearError,
}: {
  meal: MealDraft
  index: number
  /**
   * Owned by the parent, because the parent is what validates. The card used
   * to hold its own error state, so the errors `handleNext` produced had
   * nowhere to render: pressing Continue with an incomplete meal refused to
   * advance and said nothing at all about why.
   */
  errors: FieldErrors
  onRemove: () => void
  onClearError: (field: string) => void
}) {
  const { updateMeal } = useOrder()

  const allVeg = !!meal.total_guests && meal.veg_guests === meal.total_guests

  function update(payload: Partial<Omit<MealDraft, 'id' | 'dish_ids'>>) {
    updateMeal(meal.id, payload)
    for (const field of Object.keys(payload)) onClearError(field)
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--ink)]">
          {meal.name.trim() || `Meal ${index + 1}`}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--ink-3)] hover:text-red-600 transition-colors text-sm"
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
            onChange={e => update({ total_guests: e.target.value ? parseInt(e.target.value, 10) : '' })}
            onDoubleClick={e => (e.target as HTMLInputElement).select()}
            placeholder="100"
            className="form-input"
          />
        </FormField>

        <FormField
          label="Vegetarian guests"
          error={errors.veg_guests}
          action={
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-3)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVeg}
                onChange={e => update({ veg_guests: e.target.checked ? meal.total_guests : '' })}
                className="rounded border-[var(--line-strong)]"
              />
              All veg
            </label>
          }
        >
          <input
            type="number"
            min={0}
            max={meal.total_guests || undefined}
            value={meal.veg_guests}
            disabled={allVeg}
            onChange={e => update({ veg_guests: e.target.value ? parseInt(e.target.value, 10) : '' })}
            onDoubleClick={e => (e.target as HTMLInputElement).select()}
            placeholder="60"
            className={`form-input${allVeg ? ' opacity-60 bg-[var(--surface-2)] cursor-not-allowed' : ''}`}
          />
        </FormField>
      </div>
    </div>
  )
}

export function MealsStep({ onNext, onBack }: Props) {
  const { draft, addMeal, removeMeal } = useOrder()
  const [mealErrors, setMealErrors] = useState<Record<string, FieldErrors>>({})
  const [topError, setTopError] = useState('')

  /** Clears one field's error as soon as the customer edits it. */
  function clearError(mealId: string, field: string) {
    setMealErrors(prev => {
      // Returning `prev` unchanged when there was no error to clear keeps every
      // keystroke on a valid form from re-rendering the whole meal list.
      if (!prev[mealId]?.[field]) return prev
      const next = { ...prev[mealId] }
      delete next[field]
      return { ...prev, [mealId]: next }
    })
  }

  function validate(): boolean {
    if (draft.meals.length === 0) {
      setTopError('Please add at least one meal to continue.')
      return false
    }

    const next: Record<string, FieldErrors> = {}
    let valid = true

    for (const meal of draft.meals) {
      const e: FieldErrors = {}
      if (!meal.name.trim()) e.name = 'Meal name is required'
      if (!meal.date) e.date = 'Date is required'
      if (!meal.time) e.time = 'Time is required'
      if (!meal.location.trim()) e.location = 'Location is required'
      if (!meal.total_guests) e.total_guests = 'Guest count is required'
      // Caught here as well as server-side, because the number the customer
      // sees rejected on submit is far less useful than the one they can fix
      // while they are still looking at the field.
      else if (meal.veg_guests !== '' && Number(meal.veg_guests) > Number(meal.total_guests)) {
        e.veg_guests = 'Cannot exceed the total guest count'
      }
      if (Object.keys(e).length > 0) valid = false
      next[meal.id] = e
    }

    setMealErrors(next)
    setTopError(valid ? '' : 'Please complete the highlighted fields.')
    return valid
  }

  function handleNext() {
    if (validate()) onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Add your meals</h2>
        <p className="text-[var(--ink-3)] mt-1">
          Each meal can have its own date, time, location, and dish selection.
        </p>
      </div>

      {topError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {topError}
        </p>
      )}

      <div className="space-y-4">
        {draft.meals.map((meal, i) => (
          <MealCard
            key={meal.id}
            meal={meal}
            index={i}
            errors={mealErrors[meal.id] ?? {}}
            onRemove={() => removeMeal(meal.id)}
            onClearError={field => clearError(meal.id, field)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => { addMeal(); setTopError('') }}
        className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--line)] text-sm font-medium text-[var(--ink-3)] hover:border-[var(--line-strong)] hover:text-[var(--ink-2)] transition-colors"
      >
        + Add a meal
      </button>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="btn btn-secondary">Back</button>
        <button type="button" onClick={handleNext} className="btn btn-primary">
          Continue to dish selection
        </button>
      </div>
    </div>
  )
}
