'use client'

import { createContext, useContext, useReducer, useCallback } from 'react'
import type { OrderDraft, MealDraft } from '@/types'

type Action =
  | { type: 'SET_CONTACT'; payload: Pick<OrderDraft, 'client_name' | 'client_email' | 'client_phone'> }
  | { type: 'SET_EVENT'; payload: Pick<OrderDraft, 'event_name' | 'event_type'> }
  | { type: 'ADD_MEAL' }
  | { type: 'UPDATE_MEAL'; id: string; payload: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>> }
  | { type: 'REMOVE_MEAL'; id: string }
  | { type: 'SET_ACTIVE_MEAL'; id: string }
  | { type: 'ADD_DISH_TO_MEAL'; mealId: string; dishId: string }
  | { type: 'REMOVE_DISH_FROM_MEAL'; mealId: string; dishId: string }
  | { type: 'SET_DISH_NOTE'; mealId: string; dishId: string; note: string }

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
    time: '00:00',
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
  meals: [],
  active_meal_id: null,
}

function reducer(state: OrderDraft, action: Action): OrderDraft {
  switch (action.type) {
    case 'SET_CONTACT':
      return { ...state, ...action.payload }
    case 'SET_EVENT':
      return { ...state, ...action.payload }
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
  setContact: (payload: Pick<OrderDraft, 'client_name' | 'client_email' | 'client_phone'>) => void
  setEvent: (payload: Pick<OrderDraft, 'event_name' | 'event_type'>) => void
  addMeal: () => void
  updateMeal: (id: string, payload: Partial<Omit<MealDraft, 'id' | 'dish_ids' | 'dish_notes'>>) => void
  removeMeal: (id: string) => void
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
  const [draft, dispatch] = useReducer(reducer, INITIAL, init => ({
    ...init,
    client_name: initialContact?.name ?? '',
    client_email: initialContact?.email ?? '',
  }))

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
        setContact,
        setEvent,
        addMeal,
        updateMeal,
        removeMeal,
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
