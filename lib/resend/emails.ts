import { Resend } from 'resend'
import type { Order, Meal, Dish } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)

const BUSINESS_EMAIL = 'vijaykumar.sb.99@gmail.com'
const FROM = 'M G Prakash Catering <onboarding@resend.dev>'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export async function sendClientConfirmation(
  order: Order,
  meals: Meal[],
  dishMap: Record<string, Dish>,
  pdfBuffer: Buffer,
  orderUrl: string
) {
  const mealsHtml = meals.map(meal => {
    const dishes = (meal.dishes ?? []).map(d => `<li>${d.name}</li>`).join('')
    return `
      <div style="margin-bottom:24px;padding:20px;background:#fff;border:1px solid #e7e5e4;border-radius:8px;">
        <h3 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">${meal.name}</h3>
        <table style="font-size:13px;color:#78716c;border-collapse:collapse;width:100%;">
          <tr><td style="padding:3px 12px 3px 0;font-weight:600;color:#1a1a1a;">Date</td><td>${formatDate(meal.date)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600;color:#1a1a1a;">Time</td><td>${formatTime(meal.time)}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600;color:#1a1a1a;">Location</td><td>${meal.location}</td></tr>
          <tr><td style="padding:3px 12px 3px 0;font-weight:600;color:#1a1a1a;">Guests</td><td>${meal.total_guests} total (${meal.veg_guests} vegetarian)</td></tr>
        </table>
        ${dishes ? `<p style="font-size:12px;font-weight:600;color:#78716c;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.05em;">Dishes</p><ul style="margin:0;padding-left:20px;font-size:13px;color:#1a1a1a;">${dishes}</ul>` : ''}
      </div>`
  }).join('')

  await resend.emails.send({
    from: FROM,
    to: order.client_email,
    subject: `Order confirmed — ${order.event_name}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;background:#FAFAF8;padding:32px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">Your order is confirmed</h1>
        <p style="color:#78716c;margin:0 0 24px;">Thank you, ${order.client_name}. We've received your catering request for <strong>${order.event_name}</strong>.</p>

        ${mealsHtml}

        <div style="margin-top:28px;text-align:center;">
          <a href="${orderUrl}" style="display:inline-block;padding:12px 28px;background:#C8860A;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">
            View Your Order
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #e7e5e4;margin:28px 0;">
        <p style="font-size:12px;color:#a8a29e;margin:0;">
          M G Prakash Catering · 611, 10th Cross Rd, Indiranagar Rajajinagar, Bengaluru 560079<br>
          +91 98801 93165 · vijaykumar.sb.99@gmail.com
        </p>
      </div>`,
    attachments: [
      {
        filename: `order-${order.id.slice(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}

export async function sendBusinessNotification(
  order: Order,
  meals: Meal[],
  dishMap: Record<string, Dish>,
  orderUrl: string
) {
  const mealsHtml = meals.map(meal => {
    const dishes = (meal.dishes ?? []).map(d => `<li>${d.name}</li>`).join('')
    return `
      <div style="margin-bottom:16px;padding:16px;background:#fff;border:1px solid #e7e5e4;border-radius:6px;">
        <strong>${meal.name}</strong><br>
        <span style="font-size:13px;color:#78716c;">${formatDate(meal.date)} at ${formatTime(meal.time)} · ${meal.location} · ${meal.total_guests} guests (${meal.veg_guests} veg)</span>
        ${dishes ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;">${dishes}</ul>` : '<p style="font-size:13px;color:#a8a29e;margin:8px 0 0;">No dishes selected</p>'}
      </div>`
  }).join('')

  await resend.emails.send({
    from: FROM,
    to: BUSINESS_EMAIL,
    subject: `New order — ${order.event_name} (${order.client_name})`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px;">
        <h2 style="margin:0 0 4px;">New catering order received</h2>
        <p style="color:#78716c;margin:0 0 20px;">Submitted on ${new Date(order.created_at).toLocaleString('en-GB')}</p>

        <table style="font-size:14px;margin-bottom:20px;border-collapse:collapse;">
          <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Client</td><td><strong>${order.client_name}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Email</td><td>${order.client_email}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Phone</td><td>${order.client_phone}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#78716c;">Event</td><td>${order.event_name} (${order.event_type})</td></tr>
        </table>

        ${mealsHtml}

        <a href="${orderUrl}" style="display:inline-block;margin-top:8px;padding:10px 24px;background:#1a1a1a;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">
          View Full Order
        </a>
      </div>`,
  })
}
