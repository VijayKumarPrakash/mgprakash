import JSON5 from 'json5'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RawDish = Record<string, unknown>

function normaliseCourse(raw: unknown): string[] {
  const map: Record<string, string> = {
    'main course': 'main',
    'main': 'main',
    'side dish': 'side',
    'sides': 'side',
    'side': 'side',
    'starter': 'starter',
    'snack': 'snack',
    'dessert': 'dessert',
    'beverage': 'beverage',
    'bread': 'main',
    'breakfast': 'starter',
  }
  const values = Array.isArray(raw) ? raw : [raw]
  return [...new Set(
    values
      .map(v => map[String(v).toLowerCase().trim()] ?? 'main')
  )]
}

function normaliseDiet(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'veg' || s === 'vegetarian') return 'vegetarian'
  if (s === 'vegan') return 'vegan'
  if (s === 'jain') return 'jain'
  if (s === 'non-veg' || s === 'non-vegetarian') return 'non-vegetarian'
  return 'vegetarian'
}

function normaliseCuisine(raw: unknown): string | null {
  if (!raw || raw === '') return null
  if (typeof raw === 'string') {
    const map: Record<string, string> = {
      south_indian: 'South Indian',
      north_indian: 'North Indian',
      'indo-chinese': 'Indo-Chinese',
      continental: 'Continental',
      mughlai: 'Mughlai',
    }
    return map[raw.toLowerCase()] ?? raw
  }
  if (typeof raw === 'object') {
    const key = Object.keys(raw as object)[0]
    const map: Record<string, string> = {
      south_indian: 'South Indian',
      north_indian: 'North Indian',
    }
    return map[key] ?? key
  }
  return null
}

function normaliseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function normaliseFlavourProfile(dish: RawDish): string[] {
  return normaliseArray(dish['flavour_profile'] ?? dish['flavor_profile'])
}

function normaliseCookingMethod(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

async function seed() {
  const filePath = path.join(process.cwd(), 'food_db.json5')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON5.parse(raw) as { dishes: RawDish[] }

  const dishes = data.dishes.map((d: RawDish) => ({
    id: String(d.id),
    name: String(d.name),
    description: String(d.description ?? ''),
    image_url: d.image ? String(d.image) : null,
    course: normaliseCourse(d.course),
    cuisine: normaliseCuisine(d.cuisine),
    diet: normaliseDiet(d.diet),
    spice_level: d.spice_level ? String(d.spice_level) : null,
    flavour_profile: normaliseFlavourProfile(d),
    cooking_method: normaliseCookingMethod(d.cooking_method),
    ingredients: normaliseArray(d.ingredients),
    tags: normaliseArray(d.tags),
    occasion_fit: normaliseArray(d.occasion_fit),
    region_of_origin: d.region_of_origin ? String(d.region_of_origin) : null,
  }))

  console.log(`Seeding ${dishes.length} dishes…`)

  const { error } = await supabase
    .from('dishes')
    .upsert(dishes, { onConflict: 'id' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Done.')
}

seed()
