import { NextRequest, NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/server'
import { generateOrderPDF } from '@/lib/pdf/generate'
import type { Order, Meal, Dish } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAnonClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('order_id', id)
    .order('date')

  const mealRows = (meals ?? []) as Meal[]

  const { data: mealDishes } = await supabase
    .from('meal_dishes')
    .select('meal_id, dish_id')
    .in('meal_id', mealRows.map(m => m.id))

  const allDishIds = [...new Set((mealDishes ?? []).map(md => md.dish_id))]
  const { data: dishRows } = allDishIds.length
    ? await supabase.from('dishes').select('*').in('id', allDishIds)
    : { data: [] }

  const dishMap = Object.fromEntries((dishRows ?? []).map((d: Dish) => [d.id, d]))

  const mealsWithDishes: Meal[] = mealRows.map(meal => ({
    ...meal,
    dishes: (mealDishes ?? [])
      .filter(md => md.meal_id === meal.id)
      .map(md => dishMap[md.dish_id])
      .filter(Boolean) as Dish[],
  }))

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateOrderPDF(order as Order, mealsWithDishes, dishMap)
  } catch (err) {
    console.error('[pdf] generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mgprakash-order-${id.slice(0, 8)}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
