import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadStoredDraft, saveStoredDraft, clearStoredDraft, addDishToStoredDraft,
} from './order-draft-storage'
import type { OrderDraft, MealDraft } from '@/types'

/**
 * The module reads `window.sessionStorage` at call time, so a minimal in-memory
 * stand-in is enough — no jsdom needed for what is ultimately get/set/remove.
 */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
  clear() { this.map.clear() }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  get length() { return this.map.size }
}

/**
 * Assigned through a cast rather than a `declare global`. The DOM lib already
 * types `window` as `Window & typeof globalThis`, so redeclaring it conflicts,
 * and building a whole Window to satisfy that is 200-odd properties of noise
 * for a module that touches exactly one of them.
 */
const globals = globalThis as { window?: unknown }
const setWindow = (value: unknown) => { globals.window = value }
const store = () => (globals.window as { sessionStorage: Storage }).sessionStorage

beforeEach(() => {
  setWindow({ sessionStorage: new MemoryStorage() })
})

afterEach(() => {
  setWindow(undefined)
  vi.useRealTimers()
})

function meal(overrides: Partial<MealDraft> = {}): MealDraft {
  return {
    id: 'meal-1',
    name: 'Reception Dinner',
    date: '2026-12-01',
    time: '19:00',
    location: 'Rajajinagar',
    total_guests: 200,
    veg_guests: 150,
    dish_ids: ['idli'],
    dish_notes: {},
    ...overrides,
  }
}

function draft(overrides: Partial<OrderDraft> = {}): OrderDraft {
  return {
    client_name: 'Anitha Rao',
    client_email: 'anitha@example.com',
    client_phone: '+91 9880193165',
    event_name: 'Rao Reception',
    event_type: 'wedding',
    notes: '',
    meals: [meal()],
    active_meal_id: 'meal-1',
    ...overrides,
  }
}

describe('save and load', () => {
  it('round-trips a draft and the step', () => {
    saveStoredDraft(draft(), 'dishes')
    const stored = loadStoredDraft()
    expect(stored?.step).toBe('dishes')
    expect(stored?.draft.client_name).toBe('Anitha Rao')
    expect(stored?.draft.meals[0].dish_ids).toEqual(['idli'])
  })

  it('returns null when nothing has been saved', () => {
    expect(loadStoredDraft()).toBeNull()
  })

  it('does not persist an untouched draft', () => {
    // A bare visit to /order/new should leave nothing behind at all.
    saveStoredDraft(draft({ client_name: '', client_email: '', meals: [] }), 'contact')
    expect(loadStoredDraft()).toBeNull()
  })

  it('clears a previously stored draft when the form is emptied', () => {
    saveStoredDraft(draft(), 'review')
    saveStoredDraft(draft({ client_name: '', client_email: '', meals: [] }), 'contact')
    expect(loadStoredDraft()).toBeNull()
  })

  it('forgets a draft older than a day', () => {
    // A tab left open overnight would otherwise restore an event date that the
    // server now rejects for being in the past.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T10:00:00Z'))
    saveStoredDraft(draft(), 'dishes')

    vi.setSystemTime(new Date('2026-08-20T09:59:00Z'))
    expect(loadStoredDraft()).not.toBeNull()

    vi.setSystemTime(new Date('2026-08-20T10:01:00Z'))
    expect(loadStoredDraft()).toBeNull()
  })

  it('survives a corrupted entry rather than throwing', () => {
    store().setItem('mgp.order-draft.v1', '{not json')
    expect(loadStoredDraft()).toBeNull()
  })

  it('backfills a note onto a draft saved before the field existed', () => {
    // Written by hand rather than through saveStoredDraft, because this is
    // exactly what a draft written by the previous deploy looks like: no
    // `notes` key at all. The review step binds it straight to a textarea, so
    // restoring `undefined` would flip that input from uncontrolled to
    // controlled on the customer's first keystroke.
    const stale = draft()
    delete (stale as Partial<OrderDraft>).notes
    store().setItem(
      'mgp.order-draft.v1',
      JSON.stringify({ draft: stale, step: 'review', savedAt: Date.now() })
    )

    expect(loadStoredDraft()?.draft.notes).toBe('')
  })

  it('is a no-op when there is no window at all', () => {
    // Server-side import must not throw.
    setWindow(undefined)
    expect(() => saveStoredDraft(draft(), 'dishes')).not.toThrow()
    expect(loadStoredDraft()).toBeNull()
    expect(() => clearStoredDraft()).not.toThrow()
  })

  it('clears on request', () => {
    saveStoredDraft(draft(), 'dishes')
    clearStoredDraft()
    expect(loadStoredDraft()).toBeNull()
  })
})

describe('addDishToStoredDraft', () => {
  it('adds a dish to the active meal and resumes at dish selection', () => {
    saveStoredDraft(draft({ active_meal_id: 'meal-1' }), 'review')

    const outcome = addDishToStoredDraft('dosa-1')
    expect(outcome).toMatchObject({ ok: true, mealName: 'Reception Dinner' })

    const stored = loadStoredDraft()
    expect(stored?.draft.meals[0].dish_ids).toEqual(['idli', 'dosa-1'])
    // Sent back to where they were choosing dishes, not to the review page.
    expect(stored?.step).toBe('dishes')
  })

  it('does not duplicate a dish already on the meal', () => {
    // meal_dishes has a unique constraint on (meal_id, dish_id).
    saveStoredDraft(draft(), 'dishes')
    const outcome = addDishToStoredDraft('idli')
    expect(outcome).toMatchObject({ ok: true, alreadyThere: true })
    expect(loadStoredDraft()?.draft.meals[0].dish_ids).toEqual(['idli'])
  })

  it('falls back to the first meal when none is active', () => {
    saveStoredDraft(draft({ active_meal_id: null }), 'dishes')
    expect(addDishToStoredDraft('dosa-1').ok).toBe(true)
    expect(loadStoredDraft()?.draft.meals[0].dish_ids).toEqual(['idli', 'dosa-1'])
  })

  it('reports failure when there is no draft in progress', () => {
    // The dish page link then behaves exactly as it always did.
    expect(addDishToStoredDraft('dosa-1')).toEqual({ ok: false })
  })

  it('reports failure when the draft has no meals yet', () => {
    saveStoredDraft(draft({ meals: [] }), 'event')
    expect(addDishToStoredDraft('dosa-1')).toEqual({ ok: false })
  })

  it('leaves the rest of the draft untouched', () => {
    saveStoredDraft(draft({ meals: [meal(), meal({ id: 'meal-2', name: 'Lunch', dish_ids: [] })] }), 'dishes')
    addDishToStoredDraft('dosa-1')

    const stored = loadStoredDraft()
    expect(stored?.draft.client_email).toBe('anitha@example.com')
    expect(stored?.draft.event_name).toBe('Rao Reception')
    // The other meal is not touched.
    expect(stored?.draft.meals[1].dish_ids).toEqual([])
  })
})
