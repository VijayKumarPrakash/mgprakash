/**
 * Keeps an in-progress quote request alive across a navigation.
 *
 * THE PROBLEM THIS SOLVES
 * The draft lives in React context, which is memory belonging to the mounted
 * form. So the dish modal's "Open full dish page" link — a link that exists
 * precisely so a dish has a shareable address — unmounted the form and threw
 * away everything the customer had entered: contact details, every meal, every
 * dish already chosen. They then landed on the dish page, pressed the button
 * that says "add this to a quote", and were handed an empty form. Somebody
 * halfway through picking sixty dishes for a wedding lost the lot to one click
 * on a link that looked like it would help them.
 *
 * WHY sessionStorage
 * Per-tab and cleared when the tab closes, which is the right lifetime for a
 * half-finished form on what might be a shared family computer. localStorage
 * would leave a stranger's name and phone number sitting in the browser
 * indefinitely. This is *not* the "save a draft and come back tomorrow" feature
 * in the backlog — that one needs a server and a magic link, and is a different
 * job with different consent.
 *
 * Every access is wrapped: Safari in private mode throws on sessionStorage
 * rather than returning null, and a form that cannot save its progress must
 * still be a form that works.
 */

import type { OrderDraft } from '@/types'

/** Versioned, so a shape change cannot resurrect a draft the reducer cannot read. */
const KEY = 'mgp.order-draft.v1'

/**
 * A tab left open for days should not restore a stale draft — the event date it
 * holds may well be in the past by then, which the server now rejects.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface StoredDraft {
  draft: OrderDraft
  /** Which step the customer was on, so they come back to where they left. */
  step: string | null
  savedAt: number
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function loadStoredDraft(): StoredDraft | null {
  const store = storage()
  if (!store) return null

  try {
    const raw = store.getItem(KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredDraft
    if (!parsed?.draft || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      store.removeItem(KEY)
      return null
    }
    // A draft with nothing in it is not worth restoring, and restoring one
    // would make "start a new quote" impossible without clearing the tab.
    if (!parsed.draft.client_name && !parsed.draft.client_email && !parsed.draft.meals?.length) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveStoredDraft(draft: OrderDraft, step: string | null): void {
  const store = storage()
  if (!store) return

  // Nothing entered yet, nothing worth writing — this also keeps a bare visit
  // to /order/new from leaving anything behind at all.
  if (!draft.client_name && !draft.client_email && !draft.meals.length) {
    try { store.removeItem(KEY) } catch { /* nothing to do */ }
    return
  }

  try {
    store.setItem(KEY, JSON.stringify({ draft, step, savedAt: Date.now() } satisfies StoredDraft))
  } catch {
    // Quota, private mode, or a disabled store. The form carries on in memory.
  }
}

export function clearStoredDraft(): void {
  const store = storage()
  if (!store) return
  try { store.removeItem(KEY) } catch { /* nothing to do */ }
}

export interface AddDishOutcome {
  /** False when there is no draft to add to, or no meal selected in it. */
  ok: boolean
  /** The meal the dish was added to, for the confirmation copy. */
  mealName?: string
  /** True when the dish was already on that meal. */
  alreadyThere?: boolean
}

/**
 * Adds a dish to the active meal of the stored draft, in place.
 *
 * Lives here rather than in the reducer because the caller is a dish page,
 * which is outside the form's provider entirely — it has no dispatch to call.
 * The write is deliberately narrow: one dish onto the active meal, leaving
 * everything else exactly as the customer left it.
 */
export function addDishToStoredDraft(dishId: string): AddDishOutcome {
  const stored = loadStoredDraft()
  if (!stored) return { ok: false }

  const { draft } = stored
  const meal = draft.meals.find(m => m.id === draft.active_meal_id) ?? draft.meals[0]
  if (!meal) return { ok: false }

  const mealName = meal.name || 'your meal'
  if (meal.dish_ids.includes(dishId)) {
    return { ok: true, mealName, alreadyThere: true }
  }

  meal.dish_ids = [...meal.dish_ids, dishId]
  // Land back on the dish-selection step, which is where they were.
  saveStoredDraft({ ...draft, active_meal_id: meal.id }, 'dishes')

  return { ok: true, mealName }
}
