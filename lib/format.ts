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
