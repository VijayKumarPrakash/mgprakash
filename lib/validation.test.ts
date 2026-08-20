import { describe, it, expect } from 'vitest'
import { validateOrderDraft } from './validation'
import { todayInIndia } from './format'

/**
 * `POST /api/orders` writes with the service-role key, which bypasses row level
 * security entirely — the database accepts whatever it is handed. This function
 * is the only thing standing between a public endpoint and the orders table, so
 * the tests below are as much about what it *rejects* as what it lets through.
 *
 * Dates are derived from `todayInIndia()` rather than written down, so the suite
 * does not quietly start failing the day a hardcoded "future" date goes past.
 */

/** A date guaranteed to be in the future, in Bengaluru terms. */
function futureDate(daysAhead = 30): string {
  const [y, m, d] = todayInIndia().split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + daysAhead))
  return dt.toISOString().slice(0, 10)
}

function validMeal(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Reception Dinner',
    date: futureDate(),
    time: '19:30',
    location: 'Rajajinagar, Bengaluru',
    total_guests: 200,
    veg_guests: 150,
    dish_ids: ['idli', 'dosa-1'],
    dish_notes: {},
    ...overrides,
  }
}

function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    client_name: 'Anitha Rao',
    client_email: 'anitha@example.com',
    client_phone: '+91 98801 93165',
    event_name: 'Rao Wedding Reception',
    event_type: 'wedding',
    meals: [validMeal()],
    ...overrides,
  }
}

/** Narrows to the success branch, failing with the actual error if it is not. */
function expectOk(result: ReturnType<typeof validateOrderDraft>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`)
  return result.draft
}

describe('validateOrderDraft — the happy path', () => {
  it('accepts a complete order', () => {
    const draft = expectOk(validateOrderDraft(validDraft()))
    expect(draft.client_name).toBe('Anitha Rao')
    expect(draft.event_type).toBe('wedding')
    expect(draft.meals).toHaveLength(1)
    expect(draft.meals[0].total_guests).toBe(200)
  })

  it('trims every string it keeps', () => {
    const draft = expectOk(validateOrderDraft(validDraft({
      client_name: '  Anitha Rao  ',
      event_name: '  Rao Wedding Reception ',
    })))
    expect(draft.client_name).toBe('Anitha Rao')
    expect(draft.event_name).toBe('Rao Wedding Reception')
  })

  it('treats a missing phone number as valid', () => {
    // Optional in the form, so optional here. The column defaults to '' rather
    // than being nullable, so every reader gets a string.
    const draft = expectOk(validateOrderDraft(validDraft({ client_phone: '' })))
    expect(draft.client_phone).toBe('')
  })
})

describe('validateOrderDraft — contact and event', () => {
  it.each([
    ['a malformed body', 'not an object'],
    ['null', null],
  ])('rejects %s', (_label, body) => {
    const result = validateOrderDraft(body)
    expect(result.ok).toBe(false)
  })

  it('requires a name', () => {
    const result = validateOrderDraft(validDraft({ client_name: '   ' }))
    expect(result).toMatchObject({ ok: false, error: 'A name is required.' })
  })

  it('rejects an email that is not an email', () => {
    for (const bad of ['anitha', 'anitha@', '@example.com', 'a b@example.com']) {
      expect(validateOrderDraft(validDraft({ client_email: bad })).ok).toBe(false)
    }
  })

  it('rejects an event type outside the vocabulary', () => {
    // Written straight into a text column, so an unknown value would render as
    // a raw string on the confirmation page and in both emails.
    const result = validateOrderDraft(validDraft({ event_type: 'baptism' }))
    expect(result).toMatchObject({ ok: false, error: 'Please choose an event type.' })
  })

  it('accepts a normal Indian mobile, however it is spaced', () => {
    for (const good of ['+91 9880193165', '+919880193165', '+91 98801-93165']) {
      expect(validateOrderDraft(validDraft({ client_phone: good })).ok).toBe(true)
    }
  })

  it('rejects a phone number containing letters', () => {
    // The form now strips non-digits as they are typed, so this is the backstop
    // for anything that did not come from the form.
    const result = validateOrderDraft(validDraft({ client_phone: 'call me maybe' }))
    expect(result).toMatchObject({ ok: false, error: 'A phone number can only contain digits.' })
  })

  it('rejects a phone number that is too short or too long to dial', () => {
    expect(validateOrderDraft(validDraft({ client_phone: '+91 988' })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ client_phone: '+91 98801931651234' })).ok).toBe(false)
  })

  it('caps the fields that are free text', () => {
    expect(validateOrderDraft(validDraft({ client_name: 'a'.repeat(121) })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ event_name: 'a'.repeat(161) })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ client_phone: '9'.repeat(33) })).ok).toBe(false)
  })
})

describe('validateOrderDraft — meals', () => {
  it('requires at least one meal', () => {
    expect(validateOrderDraft(validDraft({ meals: [] })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ meals: 'lunch' })).ok).toBe(false)
  })

  it('caps the number of meals', () => {
    const meals = Array.from({ length: 21 }, () => validMeal())
    expect(validateOrderDraft(validDraft({ meals })).ok).toBe(false)
  })

  it('names the offending meal in the error', () => {
    // The message is shown to a customer looking at a list of meals, so it has
    // to say which one is wrong.
    const draft = validDraft({ meals: [validMeal(), validMeal({ location: '' })] })
    const result = validateOrderDraft(draft)
    expect(result).toMatchObject({ ok: false, error: 'Meal 2 needs a location.' })
  })

  it('rejects a blank or malformed time', () => {
    // The draft used to pre-fill '00:00', so this is the check that turns an
    // untouched time picker into an error rather than a midnight booking.
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ time: '' })] })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ time: '7pm' })] })).ok).toBe(false)
  })

  it('accepts today but rejects yesterday', () => {
    const today = validateOrderDraft(validDraft({ meals: [validMeal({ date: todayInIndia() })] }))
    expect(today.ok).toBe(true)

    const past = validateOrderDraft(validDraft({ meals: [validMeal({ date: futureDate(-1) })] }))
    expect(past).toMatchObject({ ok: false, error: 'Meal 1 cannot be in the past.' })
  })

  it('rejects a date that is not a date', () => {
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ date: '08-08-2026' })] })).ok).toBe(false)
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ date: '2026-13-45' })] })).ok).toBe(false)
  })

  it('requires a sane guest count', () => {
    for (const bad of [0, -5, 1.5, 'many', 100_001]) {
      expect(validateOrderDraft(validDraft({ meals: [validMeal({ total_guests: bad })] })).ok).toBe(false)
    }
  })

  it('reads a blank vegetarian count as zero rather than an error', () => {
    // The form leaves it empty when every guest eats the same menu.
    const draft = expectOk(validateOrderDraft(validDraft({ meals: [validMeal({ veg_guests: '' })] })))
    expect(draft.meals[0].veg_guests).toBe(0)
  })

  it('rejects more vegetarian guests than guests', () => {
    const result = validateOrderDraft(validDraft({
      meals: [validMeal({ total_guests: 100, veg_guests: 101 })],
    }))
    expect(result).toMatchObject({ ok: false, error: 'Meal 1 lists more vegetarian guests than guests.' })
  })
})

describe('validateOrderDraft — dishes and notes', () => {
  it('de-duplicates dish ids', () => {
    // `meal_dishes` has a unique constraint on (meal_id, dish_id), so a repeat
    // would fail the whole insert for that meal.
    const draft = expectOk(validateOrderDraft(validDraft({
      meals: [validMeal({ dish_ids: ['idli', 'idli', 'dosa-1'] })],
    })))
    expect(draft.meals[0].dish_ids).toEqual(['idli', 'dosa-1'])
  })

  it('discards non-string dish ids', () => {
    const draft = expectOk(validateOrderDraft(validDraft({
      meals: [validMeal({ dish_ids: ['idli', null, 42, '', 'dosa-1'] })],
    })))
    expect(draft.meals[0].dish_ids).toEqual(['idli', 'dosa-1'])
  })

  it('caps the number of dishes on a meal', () => {
    const dish_ids = Array.from({ length: 201 }, (_, i) => `dish-${i}`)
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ dish_ids })] })).ok).toBe(false)
  })

  it('keeps a note against a dish that is on the meal', () => {
    const draft = expectOk(validateOrderDraft(validDraft({
      meals: [validMeal({ dish_notes: { idli: '  mild, for the children  ' } })],
    })))
    expect(draft.meals[0].dish_notes).toEqual({ idli: 'mild, for the children' })
  })

  it('drops a note keyed to a dish that is not on the meal', () => {
    // The route writes with the service-role key, so a note keyed to a dish the
    // customer never selected must not reach a row that does not exist.
    const draft = expectOk(validateOrderDraft(validDraft({
      meals: [validMeal({ dish_ids: ['idli'], dish_notes: { idli: 'mild', 'gobi-65': 'extra crisp' } })],
    })))
    expect(draft.meals[0].dish_notes).toEqual({ idli: 'mild' })
  })

  it('drops empty notes rather than storing blanks', () => {
    const draft = expectOk(validateOrderDraft(validDraft({
      meals: [validMeal({ dish_notes: { idli: '   ' } })],
    })))
    expect(draft.meals[0].dish_notes).toEqual({})
  })

  it('rejects a note over 300 characters', () => {
    const result = validateOrderDraft(validDraft({
      meals: [validMeal({ dish_notes: { idli: 'a'.repeat(301) } })],
    }))
    expect(result).toMatchObject({ ok: false, error: 'Meal 1 has a dish note that is too long.' })
  })

  it('survives dish_notes being absent or the wrong type', () => {
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ dish_notes: undefined })] })).ok).toBe(true)
    expect(validateOrderDraft(validDraft({ meals: [validMeal({ dish_notes: 'mild' })] })).ok).toBe(true)
  })
})
