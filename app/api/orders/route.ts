import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createRequestClient } from '@/lib/supabase/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import { sendClientConfirmation, sendBusinessNotification } from '@/lib/resend/emails'
import type { OrderDraft, Dish, Meal, Order } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const draft: OrderDraft = await req.json()
    const supabase = createServiceClient()

    // Resolve the signed-in user (if any) — auth is optional
    const responseHeaders = new Headers()
    const authClient = createRequestClient(req, responseHeaders)
    const { data: { user } } = await authClient.auth.getUser()
    const userId = user?.id ?? null

    // 1. Insert order
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
      return NextResponse.json({ error: orderError?.message ?? 'Failed to create order' }, { status: 500 })
    }

    // 2. Insert meals and meal_dishes
    const mealsWithDishes: Meal[] = []

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
          veg_guests: mealDraft.veg_guests || 0,
        })
        .select()
        .single()

      if (mealError || !meal) continue

      if (mealDraft.dish_ids.length > 0) {
        await supabase.from('meal_dishes').insert(
          mealDraft.dish_ids.map(dish_id => ({ meal_id: meal.id, dish_id }))
        )
      }

      mealsWithDishes.push({ ...meal } as Meal)
    }

    // 3. Fetch dish data for PDF and emails
    const allDishIds = draft.meals.flatMap(m => m.dish_ids)
    const uniqueDishIds = [...new Set(allDishIds)]

    let dishMap: Record<string, Dish> = {}
    if (uniqueDishIds.length > 0) {
      const { data: dishRows } = await supabase
        .from('dishes')
        .select('*')
        .in('id', uniqueDishIds)
      if (dishRows) {
        dishMap = Object.fromEntries((dishRows as Dish[]).map(d => [d.id, d]))
      }
    }

    // Attach dish objects to each meal for PDF/email
    const mealsForPDF: Meal[] = mealsWithDishes.map((meal, i) => ({
      ...meal,
      dishes: draft.meals[i].dish_ids.map(id => dishMap[id]).filter(Boolean) as Dish[],
    }))

    const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin}/order/${order.id}`

    // 4. Generate PDF
    const pdfBuffer = await generateOrderPDF(order as Order, mealsForPDF, dishMap)

    // 5. Send emails (non-blocking failures)
    await Promise.allSettled([
      sendClientConfirmation(order as Order, mealsForPDF, dishMap, pdfBuffer, orderUrl),
      sendBusinessNotification(order as Order, mealsForPDF, dishMap, orderUrl),
    ])

    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
