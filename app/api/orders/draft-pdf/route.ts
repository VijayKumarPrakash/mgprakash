import { NextRequest, NextResponse } from 'next/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import type { OrderDraft, Dish, Order, Meal } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { draft, dishes }: { draft: OrderDraft; dishes: Dish[] } = await req.json()

    const dishMap = Object.fromEntries((dishes as Dish[]).map(d => [d.id, d]))

    const mealsForPDF: Meal[] = draft.meals.map(m => ({
      id: m.id,
      order_id: 'draft',
      name: m.name,
      date: m.date,
      time: m.time,
      location: m.location,
      total_guests: Number(m.total_guests) || 0,
      veg_guests: Number(m.veg_guests) || 0,
      dishes: m.dish_ids.map(id => dishMap[id]).filter(Boolean) as Dish[],
    }))

    const fakeOrder: Order = {
      id: 'draft-preview-0000',
      client_name: draft.client_name,
      client_email: draft.client_email,
      client_phone: draft.client_phone,
      event_name: draft.event_name,
      event_type: (draft.event_type || 'other') as Order['event_type'],
      status: 'submitted',
      created_at: new Date().toISOString(),
    }

    const pdfBuffer = await generateOrderPDF(fakeOrder, mealsForPDF, dishMap, true)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-draft.pdf"`,
      },
    })
  } catch (err) {
    console.error('[POST /api/orders/draft-pdf]', err)
    return NextResponse.json({ error: 'Failed to generate draft PDF' }, { status: 500 })
  }
}
