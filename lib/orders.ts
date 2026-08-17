import { createAnonClient } from './supabase/server'
import type { Order, Meal, Dish, SelectedDish } from '@/types'

/**
 * Loads an order with its meals and each meal's dishes.
 *
 * The confirmation page and the PDF route were carrying byte-identical copies
 * of this four-query fan-out. Two copies of a join is two chances for the
 * screen and the attachment to disagree about what was ordered, which is the
 * one thing a quote document must never do.
 */

export interface OrderWithMeals {
  order: Order
  meals: Meal[]
  /** Every dish referenced by the order, by id — what the PDF renderer wants. */
  dishMap: Record<string, Dish>
}

export async function getOrderWithMeals(id: string): Promise<OrderWithMeals | null> {
  const supabase = createAnonClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) return null

  const { data: meals } = await supabase
    .from('meals')
    .select('*')
    .eq('order_id', id)
    .order('date')

  const mealRows = (meals ?? []) as Meal[]

  // `.in()` on an empty list is a query that can only return nothing, so skip
  // both round-trips for an order that somehow has no meals.
  const { data: mealDishes } = mealRows.length
    ? await supabase
        .from('meal_dishes')
        .select('meal_id, dish_id, note')
        .in('meal_id', mealRows.map(m => m.id))
    : { data: [] as { meal_id: string; dish_id: string; note: string | null }[] }

  const links = mealDishes ?? []
  const dishIds = [...new Set(links.map(md => md.dish_id))]

  const { data: dishRows } = dishIds.length
    ? await supabase.from('dishes').select('*').in('id', dishIds)
    : { data: [] as Dish[] }

  const dishMap: Record<string, Dish> = Object.fromEntries(
    (dishRows ?? []).map(d => [(d as Dish).id, d as Dish])
  )

  const withDishes: Meal[] = mealRows.map(meal => ({
    ...meal,
    // The note travels with the dish rather than in a parallel structure, so
    // the PDF and the confirmation page cannot drift over which note belongs
    // to which dish.
    dishes: links
      .filter(md => md.meal_id === meal.id)
      .map(md => {
        const dish = dishMap[md.dish_id]
        return dish ? { ...dish, note: md.note ?? null } : null
      })
      .filter((d): d is SelectedDish => !!d),
  }))

  return { order: order as Order, meals: withDishes, dishMap }
}
