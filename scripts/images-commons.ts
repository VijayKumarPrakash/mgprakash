/**
 * Shared Wikimedia Commons access for the dish-image pipeline.
 *
 *   npm run images:fetch    stage candidates for review   (images-fetch.ts)
 *   npm run images:review   pick the right one            (images-review.ts)
 *   npm run images:apply    encode and write              (images-apply.ts)
 *
 * WHY COMMONS RATHER THAN A HAND-CURATED URL LIST
 * A list of 229 hand-picked URLs rots: hosts move files, hotlink protection
 * gets switched on, and nobody notices until a customer sees a broken card.
 * The Commons API returns the licence and the author in the same response as
 * the file, so attribution is derived from the source rather than from us
 * remembering — which is the entire reason `image_credit` is a schema column.
 *
 * WHY THE PIPELINE IS THREE STAGES AND NOT ONE
 * Commons search fails *confidently*. Ask it for "Holige" and it will return a
 * plate of chapatis with a high relevance score, because its index is weak on
 * transliterated Karnataka dish names. No scoring heuristic can tell a puran
 * poli from a paratha. So the machine does the two things it is good at —
 * finding freely-licensed candidates and encoding them — and a human does the
 * one thing in the middle that it cannot: saying which photograph is actually
 * the dish. A wrong photo is worse than the placeholder tile.
 */
import path from 'node:path'

export const COMMONS = 'https://commons.wikimedia.org/w/api.php'
export const DB = path.join(process.cwd(), 'food_db.json5')
/** Gitignored. Previews only — the full-resolution originals are fetched at apply time. */
export const STAGE_DIR = path.join(process.cwd(), '.image-candidates')
export const DECISIONS = path.join(STAGE_DIR, 'decisions.json')
export const OUT_DIR = path.join(process.cwd(), 'public', 'dishes')

/** Commons asks for a descriptive UA with contact details. Be a good citizen. */
export const UA =
  'MGPrakashCatering/1.0 (https://mgprakashcatering.com; vijaykumar.sb.99@gmail.com)'

/** Below this the 1200w output would be an upscale, which looks worse than the tile. */
export const MIN_WIDTH = 900
/** How many candidates a reviewer is shown per dish. Three fits side by side. */
export const KEEP = 3
/** Preview width for the review UI — big enough to judge, small enough to stage 600 of. */
export const PREVIEW_WIDTH = 800

const FREE = ['cc0', 'public domain', 'cc by', 'cc-by', 'cc by-sa', 'cc-by-sa', 'attribution']
const REJECT =
  /\b(logo|map|chart|diagram|poster|banner|sign|menu card|stamp|coin|portrait|packet|packaging|advertisement|cookbook)\b/i

/**
 * Commons search is weak on transliterated dish names. Steer it where the
 * plain name returns junk. Add entries here rather than editing food_db.json5.
 */
export const QUERY_OVERRIDE: Record<string, string> = {
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
export const SKIP = new Set<string>([])

export interface Candidate {
  title: string
  /** Full-resolution original. Downloaded only at apply time, for approved picks. */
  url: string
  /** Commons-rendered thumbnail, staged locally for the review UI. */
  thumbUrl: string
  width: number
  height: number
  licence: string
  author: string
  description: string
  descriptionUrl: string
  score: number
}

export interface DishCandidates {
  id: string
  name: string
  /** Every query tried, in order — printed in the review UI so a bad pick is diagnosable. */
  queries: string[]
  candidates: Candidate[]
}

/** One reviewer decision. `index` is into `candidates`; null means "keep the tile". */
export interface Decision {
  index: number | null
  at: string
}

export const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface CommonsImageInfo {
  url: string
  thumburl?: string
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

export async function api(params: Record<string, string>): Promise<CommonsResponse> {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(`${COMMONS}?${qs}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  return res.json()
}

/** Raw search. Hard filters only — scoring and truncation happen in `rank`. */
export async function search(query: string): Promise<Candidate[]> {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6', // File:
    gsrlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: String(PREVIEW_WIDTH),
  })

  return Object.values(data?.query?.pages ?? {})
    .map(p => {
      const ii = p.imageinfo?.[0]
      if (!ii) return null
      const meta = ii.extmetadata ?? {}
      return {
        title: p.title,
        url: ii.url,
        thumbUrl: ii.thumburl ?? ii.url,
        width: ii.width,
        height: ii.height,
        licence: stripHtml(meta.LicenseShortName?.value ?? ''),
        author: stripHtml(meta.Artist?.value ?? '') || 'Wikimedia Commons',
        description: stripHtml(meta.ImageDescription?.value ?? '').slice(0, 400),
        descriptionUrl: ii.descriptionurl,
        score: 0,
      } satisfies Candidate
    })
    .filter((c): c is Candidate => !!c)
    .filter(c => c.width >= MIN_WIDTH)
    .filter(c => !REJECT.test(c.title))
    .filter(c => /\.(jpe?g|png)$/i.test(c.url))
    .filter(c => FREE.some(f => c.licence.toLowerCase().includes(f)))
}

/**
 * Order candidates so the likeliest lands in slot 1, and keep the top `KEEP`.
 *
 * The score only orders the shortlist — it is not a gate. A human sees all
 * three and the threshold that used to reject a whole dish here would just be
 * throwing away the second-best guess before anyone had looked at it.
 */
export function rank(candidates: Candidate[], names: string[]): Candidate[] {
  const words = new Set(
    names.flatMap(n => n.toLowerCase().split(/\s+/)).filter(w => w.length > 3)
  )

  const seen = new Set<string>()
  return candidates
    .filter(c => (seen.has(c.title) ? false : seen.add(c.title)))
    .map(c => {
      let score = 0
      const title = c.title.toLowerCase()
      // Prefer a title that actually contains the dish name (or an alt name).
      for (const word of words) if (title.includes(word)) score += 3
      // Prefer landscape-ish: the cards are 4:3 and a tall crop loses the dish.
      const ratio = c.width / c.height
      if (ratio >= 1.15 && ratio <= 2.0) score += 2
      if (c.width >= 1600) score += 1
      // CC0 and public domain need no attribution line — mildly preferable.
      if (/cc0|public domain/i.test(c.licence)) score += 1
      return { ...c, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, KEEP)
}

export function normaliseLicence(raw: string): string {
  const l = raw.toLowerCase()
  if (l.includes('cc0') || l.includes('public domain')) return 'cc0'
  if (l.includes('sa')) return 'cc-by-sa'
  return 'cc-by'
}

/** Commons is a donated resource. Do not hammer it. */
export const polite = (ms = 300) => new Promise(r => setTimeout(r, ms))
