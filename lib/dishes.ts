import { createAnonClient } from './supabase/server'
import type { Dish } from '@/types'

export async function getAllDishes(): Promise<Dish[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Dish[]
}
