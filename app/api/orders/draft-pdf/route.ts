import { NextResponse } from 'next/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import { getDishesByIds } from '@/lib/dishes'
import { validateOrderDraft } from '@/lib/validation'
import { checkRateLimit, clientKey } from '@/lib/rate-limit'
import type { Order, Meal, SelectedDish } from '@/types'

/**
 * Ten previews every ten minutes per address.
 *
 * Looser than the submit limit because re-downloading a draft after an edit is
 * normal behaviour on the review step, and nothing here is written or emailed.
 * It is still bounded: each call renders a full React-PDF document, which costs
 * CPU and a network font fetch, and the endpoint needs no authentication.
 */
const LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 }

/**
 * Renders the "download a draft" preview from the review step.
 *
 * The client used to POST the entire 229-dish catalogue alongside the draft so
 * the server could resolve dish names — roughly a quarter of a megabyte of
 * JSON, uploaded on a mobile connection, to print at most a few dozen names
 * the server can already look up. It now sends the draft alone and the ids are
 * resolved here.
 */
export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(clientKey(req, 'draft-pdf'), LIMIT)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many draft downloads. Please try again in a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const parsed = validateOrderDraft(await req.json())
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const draft = parsed.draft

    const dishIds = [...new Set(draft.meals.flatMap(m => m.dish_ids))]
    const dishMap = new Map((await getDishesByIds(dishIds)).map(d => [d.id, d]))

    const meals: Meal[] = draft.meals.map((m, i) => ({
      // The preview is never persisted, so these ids only have to be unique
      // enough to key a React list.
      id: `draft-meal-${i}`,
      order_id: 'draft',
      name: m.name,
      date: m.date,
      time: m.time,
      location: m.location,
      total_guests: m.total_guests,
      veg_guests: m.veg_guests,
      // The draft preview must show the notes too, or the PDF a customer
      // downloads before submitting disagrees with the one they get after.
      dishes: m.dish_ids
        .map((id): SelectedDish | null => {
          const dish = dishMap.get(id)
          return dish ? { ...dish, note: m.dish_notes?.[id] ?? null } : null
        })
        .filter((d): d is SelectedDish => !!d),
    }))

    const preview: Order = {
      id: 'draft-preview-0000',
      client_name: draft.client_name,
      client_email: draft.client_email,
      client_phone: draft.client_phone,
      event_name: draft.event_name,
      event_type: draft.event_type,
      status: 'submitted',
      created_at: new Date().toISOString(),
      user_id: null,
    }

    const pdfBuffer = await generateOrderPDF(preview, meals, true)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="mgprakash-quote-draft.pdf"',
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[POST /api/orders/draft-pdf]', err)
    return NextResponse.json({ error: 'Failed to generate draft PDF' }, { status: 500 })
  }
}
