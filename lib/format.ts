/**
 * Shared display formatting.
 *
 * These four functions were previously copy-pasted across the PDF component,
 * both email templates, the review step and the confirmation page — and had
 * already drifted: two of those places rendered a meal time as the raw 24-hour
 * `18:00` while the PDF and the emails said `6:00 PM` for the same meal. A
 * customer comparing the screen against the attachment saw two different
 * documents.
 *
 * Everything is pinned to en-GB and Asia/Kolkata rather than the runtime
 * default, because the PDF and the emails are rendered on a Vercel function in
 * UTC while every reader of them is in Bengaluru.
 */

const TIME_ZONE = 'Asia/Kolkata'
const LOCALE = 'en-GB'

/**
 * Today's date in Bengaluru, as `YYYY-MM-DD`.
 *
 * Exists because "today" is not a server-side fact here. The PDF, the emails
 * and the order route all run on a Vercel function in UTC, and for the five and
 * a half hours after midnight IST a UTC date is still yesterday — so a same-day
 * booking made at 2am in Bengaluru would compare as being in the past. The
 * date-picker on the meals step had exactly that bug: its `min` came from
 * `new Date().toISOString()`.
 *
 * `en-CA` renders as ISO, but the parts are assembled by hand rather than
 * trusting that: a locale is free to change its pattern, and this string is
 * compared against a database `date` column.
 */
export function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * The current time in Bengaluru, as `HH:00`.
 *
 * Seeds the meal time picker. Rounded down to the hour because the input steps
 * in hours (`step={3600}`), so an odd number of minutes would show a value the
 * picker's own arrows could never return to.
 *
 * Same reason as `todayInIndia`: the browser's clock is whatever the customer's
 * laptop says, and a meal time is a Bengaluru time.
 */
export function nowTimeInIndia(): string {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())

  return `${hour.padStart(2, '0')}:00`
}

/** `2026-08-08` → `8 August 2026`. */
export function formatDate(date: string): string {
  // The `T00:00:00` suffix keeps a bare `YYYY-MM-DD` from being parsed as UTC
  // midnight and rendering as the previous day anywhere east of Greenwich.
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** `18:30` → `6:30 PM`. */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** A submission timestamp, in the business's own timezone. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(LOCALE, {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: TIME_ZONE,
  })
}

/**
 * The customer-facing order reference. A full uuid is unreadable over the
 * phone, so orders are quoted by their first eight characters — and that has
 * to be the same eight everywhere, or the reference on the confirmation page
 * will not match the one in the email.
 */
export function orderRef(id: string): string {
  return id.slice(0, 8).toUpperCase()
}
