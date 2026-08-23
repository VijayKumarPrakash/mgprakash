/**
 * Validates food_db.json5 against the controlled vocabulary in lib/taxonomy.ts.
 *
 * Run it after any hand-edit: `npm run validate:dishes`. It also runs as the
 * first step of `npm run seed`, so a bad value can never reach the database.
 *
 * The point is that a typo like `"course": ["mains"]` is otherwise completely
 * invisible — it seeds without complaint and simply produces a dish that no
 * filter on the site can ever return.
 */
import fs from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'
import {
  COURSES, DIETS, CUISINES, OCCASIONS,
  FLAVOURS, COOKING_METHODS, IMAGE_LICENCES,
} from '../lib/taxonomy'

type Raw = Record<string, unknown>

const errors: string[] = []
const warnings: string[] = []

const fail = (id: string, msg: string) => errors.push(`  ✗ ${id}: ${msg}`)
const warn = (id: string, msg: string) => warnings.push(`  ! ${id}: ${msg}`)

function checkList(id: string, field: string, value: unknown, allowed: readonly string[], min: number, max: number) {
  if (!Array.isArray(value)) return fail(id, `${field} must be an array`)
  if (value.length < min || value.length > max)
    fail(id, `${field} has ${value.length} entries, expected ${min}–${max}`)
  for (const v of value) {
    if (!allowed.includes(v as string)) {
      const near = allowed.find(a => a.toLowerCase().startsWith(String(v).slice(0, 3).toLowerCase()))
      fail(id, `${field}: "${v}" is not in the vocabulary${near ? ` — did you mean "${near}"?` : ''}`)
    }
  }
}

function checkOne(id: string, field: string, value: unknown, allowed: readonly string[]) {
  if (!allowed.includes(value as string)) {
    const near = allowed.find(a => a.toLowerCase().startsWith(String(value).slice(0, 3).toLowerCase()))
    fail(id, `${field}: "${value}" is not in the vocabulary${near ? ` — did you mean "${near}"?` : ''}`)
  }
}

const DAIRY = ['ghee', 'butter', 'milk', 'curd', 'yoghurt', 'paneer', 'khoya', 'cream', 'malai', 'honey', 'mawa', 'cheese']
const MEAT = ['chicken', 'mutton', 'lamb', 'fish', 'prawn', 'pork', 'crab', 'beef', 'keema', 'mince']

function main() {
  const file = path.join(process.cwd(), 'food_db.json5')
  const parsed = JSON5.parse(fs.readFileSync(file, 'utf-8')) as { dishes: Raw[] }
  const dishes = parsed.dishes ?? []

  const seen = new Map<string, string>()

  for (const d of dishes) {
    const id = String(d.id ?? '(no id)')

    if (!d.id) fail(id, 'missing id')
    if (seen.has(id)) fail(id, `duplicate id, already used by "${seen.get(id)}"`)
    seen.set(id, String(d.name))

    if (!d.name) fail(id, 'missing name')
    if (!d.description) fail(id, 'missing description')

    checkList(id, 'course', d.course, COURSES, 1, 4)
    checkList(id, 'flavour_profile', d.flavour_profile, FLAVOURS, 1, 5)
    checkList(id, 'cooking_method', d.cooking_method, COOKING_METHODS, 1, 4)
    checkList(id, 'occasion_fit', d.occasion_fit, OCCASIONS, 1, 8)
    checkOne(id, 'cuisine', d.cuisine, CUISINES)
    checkOne(id, 'diet', d.diet, DIETS)
    checkOne(id, 'image_licence', d.image_licence ?? 'placeholder', IMAGE_LICENCES)

    if (typeof d.is_vegan !== 'boolean')
      fail(id, `is_vegan must be true or false, got ${JSON.stringify(d.is_vegan)}`)

    const ing = (Array.isArray(d.ingredients) ? d.ingredients : []).map(String)
    if (ing.length < 3) fail(id, `only ${ing.length} ingredients listed`)

    // Coconut milk/cream and creamed corn are plant-based despite the words.
    const blob = ing.join(' ').toLowerCase()
      .replace(/coconut (milk|cream|malai)/g, 'coconut')
      .replace(/cream(ed)?[ -]style corn|creamed corn/g, 'corn')

    if (d.is_vegan && DAIRY.some(x => new RegExp(`\\b${x}`).test(blob)))
      fail(id, `marked vegan but lists ${DAIRY.filter(x => new RegExp(`\\b${x}`).test(blob)).join(', ')}`)

    if (d.diet === 'vegetarian' && MEAT.some(x => new RegExp(`\\b${x}`).test(blob)))
      fail(id, `marked vegetarian but lists ${MEAT.filter(x => new RegExp(`\\b${x}`).test(blob)).join(', ')}`)

    if (d.diet === 'non-vegetarian' && d.is_vegan) fail(id, 'non-vegetarian dish marked vegan')

    // Attribution is a legal requirement for these licences, not a nicety.
    if (['cc-by', 'cc-by-sa'].includes(String(d.image_licence)) && !d.image_credit)
      fail(id, `image_licence is ${d.image_licence} but image_credit is empty — attribution is required`)

    const words = String(d.description ?? '').trim().split(/\s+/).length
    if (words > 40) warn(id, `description is ${words} words — it will clamp to two lines on the card`)
  }

  console.log(`\nvalidating ${dishes.length} dishes against lib/taxonomy.ts\n`)
  if (warnings.length) {
    console.log(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`)
    warnings.forEach(w => console.log(w))
    console.log()
  }
  if (errors.length) {
    console.error(`${errors.length} error${errors.length === 1 ? '' : 's'}:`)
    errors.forEach(e => console.error(e))
    console.error('\nfood_db.json5 is not valid — fix the above and re-run.\n')
    process.exit(1)
  }
  console.log(`✓ all ${dishes.length} dishes valid\n`)
}

main()
