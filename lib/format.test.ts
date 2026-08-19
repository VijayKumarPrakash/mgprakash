import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime, orderRef, todayInIndia } from './format'

/**
 * These four functions were copy-pasted across the PDF, both emails, the review
 * step and the confirmation page before they were consolidated here, and they
 * had already drifted: two of those places rendered a meal time as the raw
 * 24-hour `18:00` while the PDF and the emails said `6:00 PM` for the same meal.
 * A customer comparing the screen against the attachment saw two different
 * documents.
 *
 * That is the class of bug these tests exist to pin. The assertions are on the
 * exact customer-facing strings, because the whole point of the module is that
 * every surface renders the same one.
 */

describe('formatDate', () => {
  it('renders en-GB long form', () => {
    expect(formatDate('2026-08-08')).toBe('8 August 2026')
  })

  it('does not shift the day', () => {
    // A bare `YYYY-MM-DD` parses as UTC midnight, which renders as the previous
    // day anywhere east of Greenwich — the reason the implementation appends
    // `T00:00:00`. Bengaluru is UTC+5:30, so this is the case that breaks.
    expect(formatDate('2026-01-01')).toBe('1 January 2026')
    expect(formatDate('2026-12-31')).toBe('31 December 2026')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatTime', () => {
  it('renders 24-hour input as 12-hour', () => {
    expect(formatTime('18:30')).toBe('6:30 PM')
    expect(formatTime('09:05')).toBe('9:05 AM')
  })

  it('handles both ends of the clock', () => {
    // `h % 12` is 0 at both midnight and noon, which is the arithmetic that
    // makes naive implementations print "0:00".
    expect(formatTime('00:00')).toBe('12:00 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
    expect(formatTime('23:59')).toBe('11:59 PM')
  })

  it('pads the minutes', () => {
    expect(formatTime('07:00')).toBe('7:00 AM')
  })

  it('returns the input unchanged when it is not a time', () => {
    expect(formatTime('')).toBe('')
    expect(formatTime('teatime')).toBe('teatime')
  })
})

describe('formatDateTime', () => {
  it('renders a UTC instant in Bengaluru time', () => {
    // 18:30 UTC is 00:00 IST the following day. The PDF and the emails render
    // on a Vercel function in UTC while every reader is in Bengaluru, so a
    // submission timestamp that is not pinned to Asia/Kolkata reports the wrong
    // day to the only people who read it.
    const rendered = formatDateTime('2026-08-08T18:30:00Z')
    expect(rendered).toContain('9 August 2026')
    expect(rendered).toContain('12:00')
  })

  it('returns the input unchanged when it is not a timestamp', () => {
    expect(formatDateTime('nonsense')).toBe('nonsense')
  })
})

describe('orderRef', () => {
  it('is the first eight characters, upper-cased', () => {
    expect(orderRef('3f2a9c1e-1234-5678-9abc-def012345678')).toBe('3F2A9C1E')
  })

  it('is stable for the same id', () => {
    // The reference is quoted over the phone and printed in the email, the PDF
    // and the confirmation page. Two surfaces disagreeing would be worse than
    // having no reference at all.
    const id = 'aabbccdd-0000-0000-0000-000000000000'
    expect(orderRef(id)).toBe(orderRef(id))
  })
})

describe('todayInIndia', () => {
  it('is a zero-padded ISO date', () => {
    // Compared as a string against a database `date` column and against the
    // date input's value, so the padding is load-bearing.
    expect(todayInIndia()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('agrees with Asia/Kolkata rather than the runtime timezone', () => {
    const expected = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
    expect(todayInIndia()).toBe(expected)
  })
})
