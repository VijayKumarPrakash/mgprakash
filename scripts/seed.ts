/**
 * Seeds the `dishes` table from food_db.json5.
 *
 * Run `npm run seed` — which validates first, so a value outside the controlled
 * vocabulary can never reach the database.
 *
 * The upsert is chunked. Supabase's REST layer will happily accept a single
 * 229-row body but times out on larger payloads once blur_data_url is populated
 * (each is a few hundred bytes of base64), so 50 at a time keeps it well inside
 * the limit and gives a usable progress line.
 */
import fs from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { CUISINE_GROUP_OF } from '../lib/taxonomy'
import type { Cuisine } from '../lib/taxonomy'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)
const CHUNK = 50

type Raw = Record<string, unknown>

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String).filter(Boolean)
  : typeof v === 'string' && v.trim() ? v.split(',').map(s => s.trim()).filter(Boolean)
  : []

async function seed() {
  const raw = fs.readFileSync(path.join(process.cwd(), 'food_db.json5'), 'utf-8')
  const { dishes: source } = JSON5.parse(raw) as { dishes: Raw[] }

  const rows = source.map(d => {
    const cuisine = String(d.cuisine) as Cuisine
    return {
      id: String(d.id),
      name: String(d.name),
      alt_names: arr(d.alt_names),
      description: String(d.description ?? ''),

      image_url: d.image ? String(d.image) : null,
      blur_data_url: d.blur_data_url ? String(d.blur_data_url) : null,
      image_licence: String(d.image_licence ?? 'placeholder'),
      image_credit: d.image_credit ? String(d.image_credit) : null,
      image_source_url: d.image_source_url ? String(d.image_source_url) : null,

      course: arr(d.course),
      cuisine,
      // Derived rather than stored in the source file: one less thing to keep
      // in sync by hand, and it cannot drift out of agreement with the cuisine.
      cuisine_group: CUISINE_GROUP_OF[cuisine] ?? null,
      region_of_origin: d.region_of_origin ? String(d.region_of_origin) : null,

      diet: String(d.diet),
      is_vegan: Boolean(d.is_vegan),
      is_jain: Boolean(d.is_jain),
      contains_onion_garlic: Boolean(d.contains_onion_garlic),

      spice_level: String(d.spice_level),
      flavour_profile: arr(d.flavour_profile),
      cooking_method: arr(d.cooking_method),
      ingredients: arr(d.ingredients),
      tags: arr(d.tags),
      occasion_fit: arr(d.occasion_fit),
    }
  })

  console.log(`seeding ${rows.length} dishes in chunks of ${CHUNK}…`)

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('dishes').upsert(chunk, { onConflict: 'id' })
    if (error) {
      console.error(`\nfailed on rows ${i}–${i + chunk.length}: ${error.message}`)
      process.exit(1)
    }
    process.stdout.write(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`)
  }

  // Anything in the table that is no longer in the source file. Not deleted
  // automatically — a dish referenced by a past order cannot be removed
  // (ON DELETE RESTRICT), and silently dropping dishes would be worse.
  const { data: existing } = await supabase.from('dishes').select('id')
  const stale = (existing ?? []).map(r => r.id).filter(id => !rows.some(r => r.id === id))

  console.log(`\n✓ seeded ${rows.length} dishes`)
  if (stale.length) {
    console.log(
      `\n${stale.length} dish(es) in the database are no longer in food_db.json5:\n  ${stale.join(', ')}\n` +
      `They were left in place — removing one that a past order references would fail.\n`
    )
  }
}

seed()
