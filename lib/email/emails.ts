import nodemailer from 'nodemailer'
import { formatDate, formatTime, formatDateTime, orderRef } from '@/lib/format'
import { BUSINESS, ADDRESS_LINE, TEL_HREF, WHATSAPP_HREF, BRAND } from '@/lib/business'
import type { Order, Meal } from '@/types'

/**
 * Mail is configured entirely by environment, and a missing value used to fail
 * the same way a wrong one did: Gmail rejected the connection, `allSettled`
 * swallowed the rejection, and the order went through with no confirmation and
 * nothing in the logs. `GMAIL_APP_PASSWORD` sat empty for some time before
 * anyone noticed.
 *
 * Misconfiguration is now separable from a send failure, so the log can say
 * which one happened and the caller can skip a doomed connection attempt.
 */
const REQUIRED_ENV = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'] as const

/** Returns a human-readable reason mail cannot be sent, or null if it can. */
export function emailConfigError(): string | null {
  const missing = REQUIRED_ENV.filter(key => !process.env[key]?.trim())
  if (!missing.length) return null
  return `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set`
}

// Built on first use rather than at import: the env is not necessarily
// populated when this module is first evaluated during a build, and creating
// the transport there would bake in whatever was — or was not — present then.
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  const problem = emailConfigError()
  if (problem) throw new Error(`Email is not configured: ${problem}`)

  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
  return transporter
}

const from = () => `"${BUSINESS.name}" <${process.env.GMAIL_USER}>`

/**
 * Authenticates against Gmail without sending anything. Used by
 * `npm run check:email` to tell a bad app password apart from a missing one.
 */
export async function verifyEmailTransport(): Promise<void> {
  await getTransporter().verify()
}

/**
 * Every interpolation below is customer-supplied: the name, the event title,
 * the venue address, all typed into a public form by anyone on the internet.
 * Dropped into the template raw, a venue field containing markup would render
 * as markup — in the business's own inbox, in an email that appears to come
 * from the business. Escaping is not optional here just because the output is
 * an email rather than a page.
 */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function dishListHtml(meal: Meal): string {
  // The note is free text typed into a public form, so it goes through esc()
  // like every other interpolation in this file — these templates are
  // hand-built HTML strings with no framework escaping anything for us.
  return (meal.dishes ?? [])
    .map(d =>
      d.note
        ? `<li>${esc(d.name)}<br>` +
          `<span style="font-size:12px;color:${BRAND.muted};">${esc(d.note)}</span></li>`
        : `<li>${esc(d.name)}</li>`
    )
    .join('')
}

/** Shared sign-off. Table-free and inline-styled — Outlook strips the rest. */
const signature = `
  <hr style="border:none;border-top:1px solid ${BRAND.line};margin:28px 0;">
  <p style="font-size:12px;color:${BRAND.muted};margin:0;">
    ${esc(BUSINESS.name)} · ${esc(ADDRESS_LINE)}<br>
    <a href="${TEL_HREF}" style="color:${BRAND.muted};text-decoration:none;">${esc(BUSINESS.phone)}</a> ·
    <a href="${WHATSAPP_HREF}" style="color:${BRAND.muted};text-decoration:none;">WhatsApp</a> ·
    ${esc(BUSINESS.email)}
  </p>`

export async function sendClientConfirmation(
  order: Order,
  meals: Meal[],
  orderUrl: string,
  /** Omitted when PDF rendering failed — the email still goes, without it. */
  pdfBuffer?: Buffer
) {
  const mealsHtml = meals.map(meal => {
    const dishes = dishListHtml(meal)
    const row = (label: string, value: string) =>
      `<tr><td style="padding:3px 12px 3px 0;font-weight:600;color:${BRAND.ink};">${label}</td><td>${value}</td></tr>`

    return `
      <div style="margin-bottom:24px;padding:20px;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:8px;">
        <h3 style="margin:0 0 12px;font-size:16px;color:${BRAND.ink};">${esc(meal.name)}</h3>
        <table style="font-size:13px;color:${BRAND.muted};border-collapse:collapse;width:100%;">
          ${row('Date', esc(formatDate(meal.date)))}
          ${row('Time', esc(formatTime(meal.time)))}
          ${row('Location', esc(meal.location))}
          ${row('Guests', `${esc(meal.total_guests)} total (${esc(meal.veg_guests)} vegetarian)`)}
        </table>
        ${dishes
          ? `<p style="font-size:12px;font-weight:600;color:${BRAND.muted};margin:14px 0 6px;text-transform:uppercase;letter-spacing:.05em;">Dishes</p>
             <ul style="margin:0;padding-left:20px;font-size:13px;color:${BRAND.ink};">${dishes}</ul>`
          : ''}
      </div>`
  }).join('')

  await getTransporter().sendMail({
    from: from(),
    to: order.client_email,
    subject: `Quote request received — ${order.event_name}`,
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:${BRAND.ink};background:${BRAND.paper};padding:32px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">We&rsquo;ve received your request</h1>
        <p style="color:${BRAND.muted};margin:0 0 24px;">
          Thank you, ${esc(order.client_name)}. We&rsquo;ll be in touch shortly to confirm availability
          and pricing for <strong>${esc(order.event_name)}</strong>.
        </p>

        ${mealsHtml}

        <div style="margin-top:28px;text-align:center;">
          <a href="${esc(orderUrl)}" style="display:inline-block;padding:12px 28px;background:${BRAND.accent};color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">
            View your order
          </a>
        </div>

        <p style="font-size:12px;color:${BRAND.muted};text-align:center;margin:14px 0 0;">
          Reference #${esc(orderRef(order.id))}
        </p>

        ${signature}
      </div>`,
    attachments: pdfBuffer
      ? [
          {
            filename: `mgprakash-order-${orderRef(order.id).toLowerCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [],
  })
}

export async function sendBusinessNotification(
  order: Order,
  meals: Meal[],
  orderUrl: string
) {
  const mealsHtml = meals.map(meal => {
    const dishes = dishListHtml(meal)
    return `
      <div style="margin-bottom:16px;padding:16px;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:6px;">
        <strong>${esc(meal.name)}</strong><br>
        <span style="font-size:13px;color:${BRAND.muted};">
          ${esc(formatDate(meal.date))} at ${esc(formatTime(meal.time))} · ${esc(meal.location)} ·
          ${esc(meal.total_guests)} guests (${esc(meal.veg_guests)} veg)
        </span>
        ${dishes
          ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;">${dishes}</ul>`
          : `<p style="font-size:13px;color:${BRAND.muted};margin:8px 0 0;">No dishes selected</p>`}
      </div>`
  }).join('')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:${BRAND.muted};">${label}</td><td>${value}</td></tr>`

  await getTransporter().sendMail({
    from: from(),
    // Replying to the notification should reach the customer, not the business
    // replying to itself — this is the whole point of the notification.
    replyTo: order.client_email,
    to: BUSINESS.email,
    subject: `New quote request — ${order.event_name} (${order.client_name})`,
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:${BRAND.ink};padding:24px;">
        <h2 style="margin:0 0 4px;">New catering request received</h2>
        <p style="color:${BRAND.muted};margin:0 0 20px;">
          Submitted ${esc(formatDateTime(order.created_at))} · #${esc(orderRef(order.id))}
        </p>

        <table style="font-size:14px;margin-bottom:20px;border-collapse:collapse;">
          ${row('Client', `<strong>${esc(order.client_name)}</strong>`)}
          ${row('Email', esc(order.client_email))}
          ${row('Phone', esc(order.client_phone))}
          ${row('Event', `${esc(order.event_name)} (${esc(order.event_type)})`)}
        </table>

        ${mealsHtml}

        <a href="${esc(orderUrl)}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:${BRAND.dark};color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">
          View full order
        </a>
      </div>`,
  })
}
