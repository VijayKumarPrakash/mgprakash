import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createRequestClient } from '@/lib/supabase/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import { sendClientConfirmation, sendBusinessNotification } from '@/lib/email/emails'
import { validateOrderDraft } from '@/lib/validation'
import type { Dish, Meal, Order } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // The form validates step by step, but this is a public endpoint and the
    // form is not the only thing that can call it. Anything that reaches the
    // database has to have been checked here.
    const parsed = validateOrderDraft(await req.json())
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const draft = parsed.draft

    const supabase = createServiceClient()

    // Resolve the signed-in user, if any — auth is optional throughout, and an
    // anonymous quote request is the normal case.
    let userId: string | null = null
    try {
      const authClient = createRequestClient(req, new Headers())
      const { data } = await authClient.auth.getUser()
      userId = data.user?.id ?? null
    } catch {
      // Unreachable auth must not block an order.
    }

    // 1. Insert the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: draft.client_name,
        client_email: draft.client_email,
        client_phone: draft.client_phone,
        event_name: draft.event_name,
        event_type: draft.event_type,
        status: 'submitted',
        user_id: userId,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[POST /api/orders] order insert failed:', orderError?.message)
      return NextResponse.json(
        { error: 'Could not save your request. Please try again.' },
        { status: 500 }
      )
    }

    // 2. Resolve dish rows once, for the PDF and both emails.
    const uniqueDishIds = [...new Set(draft.meals.flatMap(m => m.dish_ids))]
    const dishMap: Record<string, Dish> = {}
    if (uniqueDishIds.length > 0) {
      const { data: dishRows } = await supabase.from('dishes').select('*').in('id', uniqueDishIds)
      for (const row of (dishRows ?? []) as Dish[]) dishMap[row.id] = row
    }

    // 3. Insert the meals and their dish links.
    //
    // Each meal's dishes are attached from the draft that produced it, inside
    // the same iteration. The previous version paired `inserted[i]` with
    // `draft.meals[i]` after the loop, which desynchronised the moment one
    // insert was skipped — a partial failure did not drop a meal, it printed
    // the wrong menu against every meal after it, in the PDF and in the
    // customer's email alike.
    const meals: Meal[] = []

    for (const mealDraft of draft.meals) {
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          order_id: order.id,
          name: mealDraft.name,
          date: mealDraft.date,
          time: mealDraft.time,
          location: mealDraft.location,
          total_guests: mealDraft.total_guests,
          veg_guests: mealDraft.veg_guests,
        })
        .select()
        .single()

      if (mealError || !meal) {
        console.error(`[POST /api/orders] meal insert failed on ${order.id}:`, mealError?.message)
        continue
      }

      if (mealDraft.dish_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('meal_dishes')
          .insert(mealDraft.dish_ids.map(dish_id => ({ meal_id: meal.id, dish_id })))
        if (linkError) {
          console.error(`[POST /api/orders] dish links failed on meal ${meal.id}:`, linkError.message)
        }
      }

      meals.push({
        ...(meal as Meal),
        dishes: mealDraft.dish_ids.map(id => dishMap[id]).filter((d): d is Dish => !!d),
      })
    }

    const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin}/order/${order.id}`

    // 4. The order is stored and has a shareable link. Everything below is
    //    notification, and none of it is worth failing the request over:
    //    React-PDF fetches its font over the network at render time and Gmail
    //    SMTP can rate-limit, and either throwing used to return a 500 for an
    //    order that had in fact been saved — so the customer retried and
    //    submitted the whole thing twice.
    //
    //    Awaited rather than fired and forgotten: a serverless function can be
    //    frozen the instant it responds, which would drop the emails outright.
    await deliverNotifications(order as Order, meals, orderUrl)

    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Best-effort. Logs every failure and throws none of them. */
async function deliverNotifications(order: Order, meals: Meal[], orderUrl: string) {
  let pdf: Buffer | undefined
  try {
    pdf = await generateOrderPDF(order, meals)
  } catch (err) {
    // The confirmation is still worth sending without it — it carries the
    // order link, and /api/orders/[id]/pdf regenerates the document on demand.
    console.error(`[orders] PDF generation failed for ${order.id}:`, err)
  }

  const results = await Promise.allSettled([
    sendClientConfirmation(order, meals, orderUrl, pdf),
    sendBusinessNotification(order, meals, orderUrl),
  ])

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error(`[orders] notification failed for ${order.id}:`, r.reason)
    }
  }
}
