/**
 * Sources dish photographs from Wikimedia Commons, optimises them, and writes
 * the results back into food_db.json5.
 *
 *   npm run fetch:images              # every dish still on a placeholder
 *   npm run fetch:images -- --force   # re-fetch everything
 *   npm run fetch:images -- dosa-1 idli
 *
 * WHY COMMONS RATHER THAN A HAND-CURATED URL LIST
 * A list of 229 hand-picked URLs rots: hosts move files, hotlink protection
 * gets switched on, and nobody notices until a customer sees a broken card.
 * The Commons API returns the licence and the author in the same response as
 * the file, so attribution is derived from the source rather than from us
 * remembering — which is the entire reason `image_credit` is a schema column.
 *
 * WHAT IT DOES PER DISH
 *   1. search Commons for the dish name, restricted to the File namespace
 *   2. reject anything not freely licensed, too small, or obviously wrong
 *   3. download, resize to 1200w and 640w, encode WebP q=78 via sharp
 *   4. write to public/dishes/<id>.webp and <id>@sm.webp
 *   5. generate a 16px base64 LQIP for `placeholder="blur"`
 *   6. patch food_db.json5 in place, preserving comments and formatting
 *
 * Anything it cannot resolve keeps its placeholder tile, which is a perfectly
 * good outcome — a designed tile beats a photo of the wrong dish.
 *
 * REQUIRES network access — this will not run inside a sandbox with image
 * hosts firewalled off.
 *
 * sharp usually resolves already: Next depends on it for image optimisation,
 * and npm normally hoists it to the top of node_modules. That is a hoisting
 * accident rather than a guarantee, though — it is nested under next/ on some
 * installs. If the import fails, `npm i -D sharp` makes it explicit.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import JSON5 from 'json5'

const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const OUT_DIR = path.join(process.cwd(), 'public', 'dishes')
const DB = path.join(process.cwd(), 'food_db.json5')

const MIN_WIDTH = 900
const WIDTH_LARGE = 1200
const WIDTH_SMALL = 640
const QUALITY = 78
/** Commons asks for a descriptive UA with contact details. Be a good citizen. */
const UA = 'MGPrakashCatering/1.0 (https://mgprakashcatering.com; vijaykumar.sb.99@gmail.com)'

const FREE = ['cc0', 'public domain', 'cc by', 'cc-by', 'cc by-sa', 'cc-by-sa', 'attribution']
const REJECT = /\b(logo|map|chart|diagram|poster|banner|sign|menu card|stamp|coin|portrait)\b/i

/**
 * Commons search is weak on transliterated dish names. Steer it where the
 * plain name returns junk. Add entries here rather than editing food_db.json5.
 */
const QUERY_OVERRIDE: Record<string, string> = {
  'dosa-1': 'Masala dosa',
  'vada': 'Medu vada',
  'laddu': 'Boondi ladoo',
  'payasam': 'Semiya payasam',
  'white-rice': 'Steamed rice India',
  'papad': 'Papadum',
  'kayi-holige': 'Obbattu holige',
  'bele-holige': 'Puran poli',
  'khara-pongal': 'Ven pongal',
  'channa-masala': 'Chana masala',
  'dal-makhni': 'Dal makhani',
}

/** Dishes where Commons has nothing usable — skip rather than burn the quota. */
const SKIP = new Set<string>([])

interface Candidate {
  title: string
  url: string
  width: number
  height: number
  licence: string
  author: string
  descriptionUrl: string
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface CommonsImageInfo {
  url: string
  width: number
  height: number
  descriptionurl: string
  extmetadata?: Record<string, { value?: string }>
}
interface CommonsPage {
  title: string
  imageinfo?: CommonsImageInfo[]
}
interface CommonsResponse {
  query?: { pages?: Record<string, CommonsPage> }
}

async function api(params: Record<string, string>): Promise<CommonsResponse> {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(`${COMMONS}?${qs}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

async function search(query: string): Promise<Candidate[]> {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',          // File:
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
  })

  const pages = Object.values(data?.query?.pages ?? {})
  return pages
    .map(p => {
      const ii = p.imageinfo?.[0]
      if (!ii) return null
      const meta = ii.extmetadata ?? {}
      return {
        title: p.title as string,
        url: ii.url as string,
        width: ii.width as number,
        height: ii.height as number,
        licence: stripHtml(meta.LicenseShortName?.value ?? ''),
        author: stripHtml(meta.Artist?.value ?? '') || 'Wikimedia Commons',
        descriptionUrl: ii.descriptionurl as string,
      } as Candidate
    })
    .filter((c): c is Candidate => !!c)
}

function pick(candidates: Candidate[], dishName: string): Candidate | null {
  const scored = candidates
    .filter(c => c.width >= MIN_WIDTH)
    .filter(c => !REJECT.test(c.title))
    .filter(c => /\.(jpe?g|png)$/i.test(c.url))
    .filter(c => FREE.some(f => c.licence.toLowerCase().includes(f)))
    .map(c => {
      let score = 0
      const title = c.title.toLowerCase()
      // Prefer a title that actually contains the dish name.
      for (const word of dishName.toLowerCase().split(/\s+/)) {
        if (word.length > 3 && title.includes(word)) score += 3
      }
      // Prefer landscape-ish: the cards are 4:3 and a tall crop loses the dish.
      const ratio = c.width / c.height
      if (ratio >= 1.15 && ratio <= 2.0) score += 2
      if (c.width >= 1600) score += 1
      // CC0 and public domain need no attribution line — mildly preferable.
      if (/cc0|public domain/i.test(c.licence)) score += 1
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score >= 3 ? scored[0].c : null
}

function normaliseLicence(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('cc0') || l.includes('public domain')) return 'cc0'
  if (l.includes('sa')) return 'cc-by-sa'
  return 'cc-by'
}

/**
 * sharp changed its module shape between 0.34 and 0.35: 0.34 uses `export =`,
 * so the namespace itself is the callable factory, while 0.35 moved to a
 * default export and the namespace stopped being callable. Writing against
 * either one breaks on the other — and which version resolves depends on npm's
 * hoisting, since Next carries its own copy.
 *
 * So the factory type is built from sharp's *named* type exports, which are
 * stable across both, and the runtime picks whichever shape actually turned up.
 */
type SharpFactory = (
  input?: Buffer | string,
  options?: import('sharp').SharpOptions
) => import('sharp').Sharp

async function main() {
  // Imported dynamically so a missing sharp produces a useful message rather
  // than a module-resolution stack trace at load time.
  let sharp: SharpFactory
  try {
    const mod: unknown = await import('sharp')
    sharp = (
      typeof mod === 'function' ? mod : (mod as { default: unknown }).default
    ) as SharpFactory
  } catch {
    console.error('sharp is not installed. Run:  npm i -D sharp\n')
    process.exit(1)
  }

  const argv = process.argv.slice(2)
  const force = argv.includes('--force')
  const only = new Set(argv.filter(a => !a.startsWith('--')))

  await fs.mkdir(OUT_DIR, { recursive: true })

  const source = await fs.readFile(DB, 'utf-8')
  const { dishes } = JSON5.parse(source) as { dishes: Record<string, unknown>[] }

  const targets = dishes.filter(d => {
    if (SKIP.has(String(d.id))) return false
    if (only.size) return only.has(String(d.id))
    if (force) return true
    return !d.image
  })

  console.log(`\n${targets.length} dish(es) to process (of ${dishes.length})\n`)

  const results = new Map<string, Record<string, string>>()
  let ok = 0, missed = 0

  for (const [i, dish] of targets.entries()) {
    const label = `[${String(i + 1).padStart(3)}/${targets.length}] ${String(dish.name)}`
    try {
      const query = QUERY_OVERRIDE[String(dish.id)] ?? String(dish.name)
      const chosen = pick(await search(query), String(dish.name))

      if (!chosen) {
        console.log(`${label} — no suitable image, keeping placeholder`)
        missed++
        continue
      }

      const buf = Buffer.from(
        await (await fetch(chosen.url, { headers: { 'User-Agent': UA } })).arrayBuffer()
      )

      const base = sharp(buf).rotate()   // honour EXIF orientation, then strip it
      await base
        .clone()
        .resize(WIDTH_LARGE, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(path.join(OUT_DIR, `${String(dish.id)}.webp`))
      await base
        .clone()
        .resize(WIDTH_SMALL, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(path.join(OUT_DIR, `${String(dish.id)}@sm.webp`))

      // 16px wide LQIP, inlined into the HTML as the blur placeholder. Small
      // enough that it costs less than the request it saves.
      const lqip = await base
        .clone()
        .resize(16, null, { withoutEnlargement: true })
        .webp({ quality: 30 })
        .toBuffer()

      results.set(String(dish.id), {
        image: `/dishes/${String(dish.id)}.webp`,
        blur_data_url: `data:image/webp;base64,${lqip.toString('base64')}`,
        image_licence: normaliseLicence(chosen.licence),
        image_credit: chosen.author,
        image_source_url: chosen.descriptionUrl,
      })

      console.log(`${label} — ${chosen.licence} · ${chosen.author.slice(0, 40)}`)
      ok++

      // Commons is a donated resource. Do not hammer it.
      await new Promise(r => setTimeout(r, 350))
    } catch (err) {
      console.log(`${label} — failed: ${(err as Error).message}`)
      missed++
    }
  }

  if (results.size) {
    // Patch in place with a targeted regex rather than re-serialising, so the
    // header comments and the hand-tuned formatting of food_db.json5 survive.
    let patched = source
    for (const [id, fields] of results) {
      const block = new RegExp(
        `("id":\\s*"${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"[\\s\\S]*?)\\n(\\s*)\\},`
      )
      patched = patched.replace(block, (match, body: string, indent: string) => {
        let out = body
        for (const [k, v] of Object.entries(fields)) {
          const line = `${indent}  ${JSON.stringify(k)}: ${JSON.stringify(v)},`
          const existing = new RegExp(`\\n\\s*${JSON.stringify(k)}:.*?,(?=\\n)`)
          out = existing.test(out) ? out.replace(existing, `\n${line}`) : `${out}\n${line}`
        }
        return `${out}\n${indent}},`
      })
    }
    await fs.writeFile(DB, patched)
  }

  console.log(
    `\n✓ ${ok} image(s) written to public/dishes` +
    `\n  ${missed} kept their placeholder tile` +
    (ok ? `\n\nNext:  npm run validate:dishes && npm run seed\n` : '\n')
  )
}

main()
