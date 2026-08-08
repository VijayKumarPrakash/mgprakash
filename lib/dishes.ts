import fs from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'
import { createAnonClient } from './supabase/server'
import { CUISINE_GROUP_OF, BROWSE_ORDER } from './taxonomy'
import type { Cuisine } from './taxonomy'
import type { Dish } from '@/types'

/**
 * Reads the catalogue from Supabase, falling back to food_db.json5 on disk.
 *
 * The fallback is not just defensive — it means the site builds and renders
 * fully without any Supabase credentials at all, so `npm run build` works on a
 * fresh clone and a preview deploy never shows an empty menu because an env var
 * was missed. In normal operation Supabase answers and the file is never read.
 */

let cache: Dish[] | null = null

function fromFile(): Dish[] {
  if (cache) return cache
  const raw = fs.readFileSync(path.join(process.cwd(), 'food_db.json5'), 'utf-8')
  const { dishes } = JSON5.parse(raw) as { dishes: Record<string, unknown>[] }

  cache = dishes.map(d => {
    const cuisine = String(d.cuisine) as Cuisine
    return {
      id: String(d.id),
      name: String(d.name),
      alt_names: (d.alt_names as string[]) ?? [],
      description: String(d.description ?? ''),
      image_url: d.image ? String(d.image) : null,
      blur_data_url: d.blur_data_url ? String(d.blur_data_url) : null,
      image_licence: (d.image_licence as Dish['image_licence']) ?? 'placeholder',
      image_credit: (d.image_credit as string) ?? null,
      image_source_url: (d.image_source_url as string) ?? null,
      course: (d.course as Dish['course']) ?? [],
      cuisine,
      cuisine_group: CUISINE_GROUP_OF[cuisine] ?? 'North Indian',
      region_of_origin: (d.region_of_origin as string) ?? null,
      diet: d.diet as Dish['diet'],
      is_vegan: Boolean(d.is_vegan),
      is_jain: Boolean(d.is_jain),
      contains_onion_garlic: Boolean(d.contains_onion_garlic),
      spice_level: d.spice_level as Dish['spice_level'],
      flavour_profile: (d.flavour_profile as Dish['flavour_profile']) ?? [],
      cooking_method: (d.cooking_method as Dish['cooking_method']) ?? [],
      ingredients: (d.ingredients as string[]) ?? [],
      tags: (d.tags as string[]) ?? [],
      occasion_fit: (d.occasion_fit as Dish['occasion_fit']) ?? [],
    } satisfies Dish
  })

  return cache
}

/** Rows written before the schema migration may be missing the newer columns. */
function hydrate(row: Record<string, unknown>): Dish {
  const cuisine = String(row.cuisine ?? 'Pan-Indian') as Cuisine
  return {
    ...(row as unknown as Dish),
    alt_names: (row.alt_names as string[]) ?? [],
    cuisine,
    cuisine_group: (row.cuisine_group as Dish['cuisine_group']) ?? CUISINE_GROUP_OF[cuisine] ?? 'North Indian',
    image_licence: (row.image_licence as Dish['image_licence']) ?? 'placeholder',
    blur_data_url: (row.blur_data_url as string) ?? null,
    image_credit: (row.image_credit as string) ?? null,
    image_source_url: (row.image_source_url as string) ?? null,
    is_vegan: Boolean(row.is_vegan),
    is_jain: Boolean(row.is_jain),
    contains_onion_garlic: row.contains_onion_garlic !== false,
    spice_level: (row.spice_level as Dish['spice_level']) ?? 'medium',
    course: (row.course as Dish['course']) ?? [],
    flavour_profile: (row.flavour_profile as Dish['flavour_profile']) ?? [],
    cooking_method: (row.cooking_method as Dish['cooking_method']) ?? [],
    ingredients: (row.ingredients as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    occasion_fit: (row.occasion_fit as Dish['occasion_fit']) ?? [],
  }
}

/**
 * One sort for both code paths. Supabase returns `.order('name')` and the file
 * returns file order, and the two disagreeing means the catalogue looks
 * different depending on whether the database happens to be reachable.
 */
function sortForBrowsing(dishes: Dish[]): Dish[] {
  const rank = (d: Dish) => {
    const i = Math.min(...d.course.map(c => BROWSE_ORDER.indexOf(c)).filter(n => n >= 0))
    return Number.isFinite(i) ? i : BROWSE_ORDER.length
  }
  return [...dishes].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'en-IN'))
}

export async function getAllDishes(): Promise<Dish[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return sortForBrowsing(fromFile())
  }

  try {
    const supabase = createAnonClient()
    const { data, error } = await supabase.from('dishes').select('*').order('name')
    if (error) throw new Error(error.message)
    if (!data?.length) return sortForBrowsing(fromFile())
    return sortForBrowsing(data.map(r => hydrate(r as Record<string, unknown>)))
  } catch (err) {
    console.warn('[dishes] Supabase read failed, falling back to food_db.json5:', (err as Error).message)
    return sortForBrowsing(fromFile())
  }
}

export async function getDishesByIds(ids: string[]): Promise<Dish[]> {
  if (!ids.length) return []
  const all = await getAllDishes()
  const index = new Map(all.map(d => [d.id, d]))
  return ids.map(id => index.get(id)).filter((d): d is Dish => !!d)
}
