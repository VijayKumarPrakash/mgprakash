'use client'

import { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react'

import { nowTimeInIndia } from '@/lib/format'
import { loadStoredDraft, saveStoredDraft, clearStoredDraft } from '@/lib/order-draft-storage'
import type { OrderDraft, MealDraft } from '@/types'

type Action =
  | { type: 'SET_CONTACT'; payload: Pick<OrderDraft, 'client_name' | 'client_email' | 'client_phone'> }
  | { type: 'SET_EVENT'; payload: Pick<OrderDraft, 'event_name' | 'event_type'> }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'ADD_MEAL' }
  | { type: 'UPDATE_MEAL'; id: string; payload: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>> }
  | { type: 'REMOVE_MEAL'; id: string }
  | { type: 'RESTORE_MEAL'; meal: MealDraft; index: number; activeMealId: string | null }
  | { type: 'SET_ACTIVE_MEAL'; id: string }
  | { type: 'ADD_DISH_TO_MEAL'; mealId: string; dishId: string }
  | { type: 'REMOVE_DISH_FROM_MEAL'; mealId: string; dishId: string }
  | { type: 'SET_DISH_NOTE'; mealId: string; dishId: string; note: string }
  | { type: 'HYDRATE'; draft: OrderDraft }

/**
 * These ids never leave the browser — the database generates its own uuid for
 * every meal on insert. They only have to be unique enough to key a React list
 * and to address a meal in the reducer, which `crypto.randomUUID` does natively
 * in every browser this app supports. It replaced the `uuid` package, a
 * production dependency that existed for this one call.
 */
function makeMeal(overrides: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>> = {}): MealDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    date: '',
    // Seeded with the current Bengaluru hour. This was '00:00', which was worse
    // than useless — a customer who never opened the picker silently booked a
    // meal at midnight, and it passed every check. "Now" is at least a time
    // somebody might mean, and it puts the picker within a few arrow presses of
    // any realistic answer instead of starting at the far end of the clock.
    time: nowTimeInIndia(),
    location: '',
    total_guests: '',
    veg_guests: '',
    dish_ids: [],
    dish_notes: {},
    ...overrides,
  }
}

const INITIAL: OrderDraft = {
  client_name: '',
  client_email: '',
  client_phone: '',
  event_name: '',
  event_type: '',
  notes: '',
  meals: [],
  active_meal_id: null,
}

function reducer(state: OrderDraft, action: Action): OrderDraft {
  switch (action.type) {
    // Replaces the whole draft with one restored from sessionStorage. Applied
    // through the reducer rather than by reaching into state so there is still
    // exactly one place the draft changes.
    case 'HYDRATE':
      return action.draft
    case 'SET_CONTACT':
      return { ...state, ...action.payload }
    case 'SET_EVENT':
      return { ...state, ...action.payload }
    case 'SET_NOTES':
      return { ...state, notes: action.notes }
    case 'ADD_MEAL': {
      const first = state.meals[0]
      const meal = makeMeal(first ? {
        date: first.date,
        location: first.location,
        total_guests: first.total_guests,
        veg_guests: first.veg_guests,
      } : {})
      return {
        ...state,
        meals: [...state.meals, meal],
        active_meal_id: state.active_meal_id ?? meal.id,
      }
    }
    case 'UPDATE_MEAL':
      return {
        ...state,
        meals: state.meals.map(m =>
          m.id === action.id ? { ...m, ...action.payload } : m
        ),
      }
    case 'REMOVE_MEAL': {
      const meals = state.meals.filter(m => m.id !== action.id)
      const active =
        state.active_meal_id === action.id
          ? meals[0]?.id ?? null
          : state.active_meal_id
      return { ...state, meals, active_meal_id: active }
    }
    // The undo side of REMOVE_MEAL. Carries the whole removed MealDraft back
    // in rather than reconstructing it, so its dish_ids and dish_notes come
    // back exactly as they were — undo has to be a true undo, not "add a new
    // empty meal with the old name". Restored at its original index rather
    // than appended, and active_meal_id is set back explicitly because
    // REMOVE_MEAL may have already reassigned it to a different meal.
    case 'RESTORE_MEAL': {
      const meals = [...state.meals]
      meals.splice(Math.min(action.index, meals.length), 0, action.meal)
      return { ...state, meals, active_meal_id: action.activeMealId }
    }
    case 'SET_ACTIVE_MEAL':
      return { ...state, active_meal_id: action.id }
    case 'ADD_DISH_TO_MEAL':
      return {
        ...state,
        meals: state.meals.map(m =>
          m.id === action.mealId && !m.dish_ids.includes(action.dishId)
            ? { ...m, dish_ids: [...m.dish_ids, action.dishId] }
            : m
        ),
      }
    case 'REMOVE_DISH_FROM_MEAL':
      return {
        ...state,
        meals: state.meals.map(m => {
          if (m.id !== action.mealId) return m
          // Drop the note along with the dish. Keeping it would resurrect a
          // note the customer thought they had deleted if they re-added the
          // dish, and would otherwise linger in state attached to nothing.
          const dish_notes = { ...m.dish_notes }
          delete dish_notes[action.dishId]
          return { ...m, dish_ids: m.dish_ids.filter(id => id !== action.dishId), dish_notes }
        }),
      }
    case 'SET_DISH_NOTE':
      return {
        ...state,
        meals: state.meals.map(m =>
          m.id === action.mealId
            ? { ...m, dish_notes: { ...m.dish_notes, [action.dishId]: action.note } }
            : m
        ),
      }
    default:
      return state
  }
}

interface OrderContextValue {
  draft: OrderDraft
  activeMeal: MealDraft | null
  /**
   * The step the customer was on when they navigated away, so the form can jump
   * back to it. Null on a fresh start.
   */
  restoredStep: string | null
  /** Called after a successful submit, so a fresh visit starts clean. */
  discardStoredDraft: () => void
  /** Records the current step, so a restore lands where the customer left. */
  noteStep: (step: string) => void
  setContact: (payload: Pick<OrderDraft, 'client_name' | 'client_email' | 'client_phone'>) => void
  setEvent: (payload: Pick<OrderDraft, 'event_name' | 'event_type'>) => void
  /** Order-level free text — a requirement that spans every dish, not one of them. */
  setNotes: (notes: string) => void
  addMeal: () => void
  updateMeal: (id: string, payload: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>>) => void
  removeMeal: (id: string) => void
  /** Undoes a REMOVE_MEAL — see the toast in MealsStep. */
  restoreMeal: (meal: MealDraft, index: number, activeMealId: string | null) => void
  setActiveMeal: (id: string) => void
  addDishToMeal: (mealId: string, dishId: string) => void
  removeDishFromMeal: (mealId: string, dishId: string) => void
  setDishNote: (mealId: string, dishId: string, note: string) => void
}

const OrderCtx = createContext<OrderContextValue | null>(null)

export function OrderProvider({
  children,
  initialContact,
}: {
  children: React.ReactNode
  /** Pre-fills name and email from the signed-in Google account, when present. */
  initialContact?: { name?: string; email?: string }
}) {
  // Seeded at reducer-init rather than written back in a mount effect. The
  // effect version rendered the contact step with empty inputs and then
  // re-rendered with them filled, which reads as a flicker and, worse, meant
  // any keystroke landing in that window was overwritten.
  /**
   * Read once, synchronously, before the first render.
   *
   * This is only safe because the form is never server-rendered — see
   * `OrderFormClient`, which loads it with `ssr: false` precisely so that
   * sessionStorage can be read in an initialiser like this one. Reading it in
   * an effect instead would mean a render with empty inputs followed by a
   * render with full ones, and React's own lint rules rightly object to
   * setting state from an effect to achieve it.
   */
  const [stored] = useState(loadStoredDraft)

  const [draft, dispatch] = useReducer(reducer, INITIAL, init =>
    stored?.draft ?? {
      ...init,
      client_name: initialContact?.name ?? '',
      client_email: initialContact?.email ?? '',
    }
  )

  /** The step the customer left from, so the form can resume there. */
  const restoredStep = stored?.step ?? null

  /** Reported by the form whenever the customer moves between steps. */
  const [step, setStepState] = useState<string | null>(null)
  const noteStep = useCallback((next: string) => setStepState(next), [])

  /**
   * Persisted on every change.
   *
   * Safe to run from the first render because the draft was seeded from storage
   * synchronously above — there is no window in which an empty draft could
   * overwrite the stored one, which is the classic way this pattern eats the
   * very data it exists to protect.
   */
  useEffect(() => {
    saveStoredDraft(draft, step)
  }, [draft, step])

  const discardStoredDraft = useCallback(() => {
    clearStoredDraft()
  }, [])

  const activeMeal = draft.meals.find(m => m.id === draft.active_meal_id) ?? null

  const setContact = useCallback(
    (p: Pick<OrderDraft, 'client_name' | 'client_email' | 'client_phone'>) =>
      dispatch({ type: 'SET_CONTACT', payload: p }),
    []
  )
  const setEvent = useCallback(
    (p: Pick<OrderDraft, 'event_name' | 'event_type'>) =>
      dispatch({ type: 'SET_EVENT', payload: p }),
    []
  )
  const setNotes = useCallback(
    (notes: string) => dispatch({ type: 'SET_NOTES', notes }),
    []
  )
  const addMeal = useCallback(() => dispatch({ type: 'ADD_MEAL' }), [])
  const updateMeal = useCallback(
    (id: string, p: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>>) =>
      dispatch({ type: 'UPDATE_MEAL', id, payload: p }),
    []
  )
  const removeMeal = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_MEAL', id }),
    []
  )
  const restoreMeal = useCallback(
    (meal: MealDraft, index: number, activeMealId: string | null) =>
      dispatch({ type: 'RESTORE_MEAL', meal, index, activeMealId }),
    []
  )
  const setActiveMeal = useCallback(
    (id: string) => dispatch({ type: 'SET_ACTIVE_MEAL', id }),
    []
  )
  const addDishToMeal = useCallback(
    (mealId: string, dishId: string) =>
      dispatch({ type: 'ADD_DISH_TO_MEAL', mealId, dishId }),
    []
  )
  const removeDishFromMeal = useCallback(
    (mealId: string, dishId: string) =>
      dispatch({ type: 'REMOVE_DISH_FROM_MEAL', mealId, dishId }),
    []
  )
  const setDishNote = useCallback(
    (mealId: string, dishId: string, note: string) =>
      dispatch({ type: 'SET_DISH_NOTE', mealId, dishId, note }),
    []
  )

  return (
    <OrderCtx.Provider
      value={{
        draft,
        activeMeal,
        restoredStep,
        discardStoredDraft,
        noteStep,
        setContact,
        setEvent,
        setNotes,
        addMeal,
        updateMeal,
        removeMeal,
        restoreMeal,
        setActiveMeal,
        addDishToMeal,
        removeDishFromMeal,
        setDishNote,
      }}
    >
      {children}
    </OrderCtx.Provider>
  )
}

export function useOrder() {
  const ctx = useContext(OrderCtx)
  if (!ctx) throw new Error('useOrder must be used inside OrderProvider')
  return ctx
}
