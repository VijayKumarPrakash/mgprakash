import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createReadOnlyRequestClient } from '@/lib/supabase/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import { sendClientConfirmation, sendBusinessNotification, emailConfigError } from '@/lib/email/emails'
import { validateOrderDraft } from '@/lib/validation'
import type { Dish, Meal, Order, SelectedDish } from '@/types'

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
      const authClient = createReadOnlyRequestClient(req)
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
    // Collected rather than only logged. A `console.error` in a Vercel log is
    // invisible to the person who needs to know that a meal the customer chose
    // is not in the order they are about to be quoted for.
    const issues: string[] = []

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
        issues.push(`"${mealDraft.name}" (${mealDraft.date}) could not be saved — the customer selected it but it is not on this order.`)
        continue
      }

      if (mealDraft.dish_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('meal_dishes')
          .insert(mealDraft.dish_ids.map(dish_id => ({
            meal_id: meal.id,
            dish_id,
            note: mealDraft.dish_notes[dish_id] ?? null,
          })))
        if (linkError) {
          console.error(`[POST /api/orders] dish links failed on meal ${meal.id}:`, linkError.message)
          issues.push(`The ${mealDraft.dish_ids.length} dishes chosen for "${mealDraft.name}" were not saved against it — check the menu with the customer.`)
        }
      }

      meals.push({
        ...(meal as Meal),
        dishes: mealDraft.dish_ids
          .map((id): SelectedDish | null => {
            const dish = dishMap[id]
            return dish ? { ...dish, note: mealDraft.dish_notes[id] ?? null } : null
          })
          .filter((d): d is SelectedDish => !!d),
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
    await deliverNotifications(order as Order, meals, orderUrl, issues)

    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Best-effort. Logs every failure and throws none of them. */
async function deliverNotifications(
  order: Order,
  meals: Meal[],
  orderUrl: string,
  /** Anything the write phase could not persist; flagged to the business only. */
  issues: string[] = []
) {
  // Checked before doing any work. A missing app password is not a transient
  // send failure buried in an SMTP stack trace, it is a deployment that was
  // never finished — and it silently costs the business every enquiry, so it
  // gets a log line that names the problem and the customer left waiting.
  const misconfigured = emailConfigError()
  if (misconfigured) {
    console.error(
      `[orders] EMAIL NOT SENT for ${order.id} — ${misconfigured}. ` +
      `Order is saved, but ${order.client_email} received no confirmation and ` +
      `the business was not notified. Set it in .env.local and in the Vercel ` +
      `project environment, then redeploy.`
    )
    // The banner in the business email is the only place these are reported, so
    // if that email is not going out they would vanish entirely. Log them here
    // rather than lose them.
    if (issues.length) {
      console.error(`[orders] ${order.id} also had write failures:`, issues.join(' | '))
    }
    return
  }

  let pdf: Buffer | undefined
  try {
    pdf = await generateOrderPDF(order, meals)
  } catch (err) {
    // The confirmation is still worth sending without it — it carries the
    // order link, and /api/orders/[id]/pdf regenerates the document on demand.
    console.error(`[orders] PDF generation failed for ${order.id}:`, err)
  }

  const [client, business] = await Promise.allSettled([
    sendClientConfirmation(order, meals, orderUrl, pdf),
    sendBusinessNotification(order, meals, orderUrl, issues),
  ])

  // Named individually: "the customer got nothing" and "the business got
  // nothing" are different problems and only one of them loses an enquiry.
  if (client.status === 'rejected') {
    console.error(`[orders] confirmation to ${order.client_email} failed for ${order.id}:`, client.reason)
  }
  if (business.status === 'rejected') {
    console.error(`[orders] business notification failed for ${order.id}:`, business.reason)
  }
}
