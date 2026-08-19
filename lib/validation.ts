import { todayInIndia } from '@/lib/format'
import { EVENT_TYPES } from '@/types'
import type { EventType, OrderDraft } from '@/types'

/**
 * Server-side validation for the order submission payload.
 *
 * `POST /api/orders` writes with the service-role key, which bypasses row
 * level security entirely — the database will accept whatever it is handed.
 * The multi-step form checks each field on the way through, but the route is a
 * public endpoint and the form is not the only caller, so the checks have to
 * exist on this side of the wire too. Previously the body was cast straight to
 * `OrderDraft` and inserted, which meant a hand-rolled request could store an
 * order with an empty name, a nonsense event type, or a thousand meals.
 *
 * Deliberately hand-written rather than a schema library: it is one payload,
 * the rules are business rules rather than shapes, and the messages are shown
 * to a customer.
 */

/** Bounds, not guesses at reasonable use — they exist to cap abuse. */
const LIMITS = {
  name: 120,
  email: 254,
  phone: 32,
  eventName: 160,
  location: 300,
  mealName: 120,
  meals: 20,
  dishesPerMeal: 200,
  dishNote: 300,
  guests: 100_000,
} as const

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}(:\d{2})?$/

export type ValidationResult =
  | { ok: true; draft: SubmittedOrder }
  | { ok: false; error: string }

/** An `OrderDraft` that has been checked: guest counts are numbers, not `''`. */
export interface SubmittedOrder extends Omit<OrderDraft, 'event_type' | 'meals' | 'active_meal_id'> {
  event_type: EventType
  meals: SubmittedMeal[]
}

export interface SubmittedMeal {
  name: string
  date: string
  time: string
  location: string
  total_guests: number
  veg_guests: number
  dish_ids: string[]
  /** Per-dish notes, keyed by dish id. Only ids present in `dish_ids` survive. */
  dish_notes: Record<string, string>
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateOrderDraft(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Malformed request.' }
  }
  const raw = body as Record<string, unknown>

  const client_name = str(raw.client_name)
  const client_email = str(raw.client_email)
  const client_phone = str(raw.client_phone)
  const event_name = str(raw.event_name)
  const event_type = str(raw.event_type)

  if (!client_name) return { ok: false, error: 'A name is required.' }
  if (client_name.length > LIMITS.name) return { ok: false, error: 'That name is too long.' }

  if (!client_email) return { ok: false, error: 'An email address is required.' }
  if (client_email.length > LIMITS.email || !EMAIL.test(client_email)) {
    return { ok: false, error: 'That email address does not look valid.' }
  }

  // The phone number is optional in the form, so it is optional here too.
  if (client_phone.length > LIMITS.phone) return { ok: false, error: 'That phone number is too long.' }

  if (!event_name) return { ok: false, error: 'An event name is required.' }
  if (event_name.length > LIMITS.eventName) return { ok: false, error: 'That event name is too long.' }

  if (!(EVENT_TYPES as readonly string[]).includes(event_type)) {
    return { ok: false, error: 'Please choose an event type.' }
  }

  if (!Array.isArray(raw.meals) || raw.meals.length === 0) {
    return { ok: false, error: 'Add at least one meal.' }
  }
  if (raw.meals.length > LIMITS.meals) {
    return { ok: false, error: `An order can hold at most ${LIMITS.meals} meals.` }
  }

  const meals: SubmittedMeal[] = []

  for (const [i, entry] of raw.meals.entries()) {
    const label = `Meal ${i + 1}`
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: `${label} is malformed.` }
    }
    const m = entry as Record<string, unknown>

    const name = str(m.name)
    const date = str(m.date)
    const time = str(m.time)
    const location = str(m.location)

    if (!name || name.length > LIMITS.mealName) return { ok: false, error: `${label} needs a name.` }
    if (!DATE.test(date) || Number.isNaN(Date.parse(date))) {
      return { ok: false, error: `${label} needs a valid date.` }
    }
    // The date input carries `min={today}`, but that is a hint to a browser and
    // nothing more: a stale tab left open overnight, or any request not coming
    // from the form, could book an event in the past. Compared as strings, which
    // is safe for zero-padded ISO dates and avoids inventing a timezone for a
    // value that has none.
    if (date < todayInIndia()) {
      return { ok: false, error: `${label} cannot be in the past.` }
    }
    if (!TIME.test(time)) return { ok: false, error: `${label} needs a valid time.` }
    if (!location || location.length > LIMITS.location) {
      return { ok: false, error: `${label} needs a location.` }
    }

    const total_guests = Number(m.total_guests)
    if (!Number.isInteger(total_guests) || total_guests < 1 || total_guests > LIMITS.guests) {
      return { ok: false, error: `${label} needs a guest count.` }
    }

    // Blank means "not stated", which is zero rather than an error — the form
    // leaves it empty when every guest eats the same menu.
    const veg_guests = m.veg_guests === '' || m.veg_guests == null ? 0 : Number(m.veg_guests)
    if (!Number.isInteger(veg_guests) || veg_guests < 0) {
      return { ok: false, error: `${label} has an invalid vegetarian guest count.` }
    }
    if (veg_guests > total_guests) {
      return { ok: false, error: `${label} lists more vegetarian guests than guests.` }
    }

    const rawIds = Array.isArray(m.dish_ids) ? m.dish_ids : []
    if (rawIds.length > LIMITS.dishesPerMeal) {
      return { ok: false, error: `${label} has too many dishes.` }
    }
    // De-duplicated here as well as in the reducer: `meal_dishes` has a unique
    // constraint on (meal_id, dish_id), so a repeat would fail the whole insert.
    const dish_ids = [...new Set(rawIds.filter((v): v is string => typeof v === 'string' && !!v))]

    // Notes are keyed by dish id, and the route writes with the service-role
    // key, so this cannot trust the form: anything keyed to a dish that is not
    // actually on this meal is dropped rather than written to a row that does
    // not exist, and each note is trimmed and capped.
    const rawNotes = (m.dish_notes ?? {}) as Record<string, unknown>
    const dish_notes: Record<string, string> = {}
    if (typeof rawNotes === 'object' && rawNotes !== null) {
      for (const id of dish_ids) {
        const note = str(rawNotes[id])
        if (!note) continue
        if (note.length > LIMITS.dishNote) {
          return { ok: false, error: `${label} has a dish note that is too long.` }
        }
        dish_notes[id] = note
      }
    }

    meals.push({ name, date, time, location, total_guests, veg_guests, dish_ids, dish_notes })
  }

  return {
    ok: true,
    draft: {
      client_name,
      client_email,
      client_phone,
      event_name,
      event_type: event_type as EventType,
      meals,
    },
  }
}
