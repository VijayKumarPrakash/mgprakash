import Image from 'next/image'
import { COURSE_LABELS } from '@/lib/taxonomy'
import type { Course } from '@/lib/taxonomy'

/**
 * Renders a dish photo, or — for the many dishes that have no free-licence
 * photograph — a designed placeholder tile.
 *
 * The placeholder is deliberately a component rather than 229 generated image
 * files: zero bytes in the repo, crisp at any density, no build step to keep in
 * sync, and identical markup on server and client, so it costs nothing in
 * layout shift. The hue is derived from a hash of the dish id so a grid of
 * tiles reads as varied rather than as a wall of identical boxes, and is stable
 * across renders and deploys.
 *
 * The mark is a thali seen from above — an outer rim, an inner well, and a
 * course-specific glyph in the centre. Concentric and centred rather than
 * rotated off-axis, because anything rotated at low contrast reads as a
 * scratch on the screen rather than as deliberate art direction.
 */

/** FNV-1a. Small, fast, and — unlike Math.random or Date — deterministic, which
 *  is what keeps the server and client markup byte-identical. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Warm hues sampled from the palette's own range, so tiles never fight the
 *  copper accent. Clay → copper → amber → brass → olive. */
const HUES = [14, 22, 30, 38, 46, 62, 74, 18]

/** Drawn inside a 100×100 box centred on the plate. Kept to a few strokes each:
 *  at 14% opacity anything busier turns to mush. */
const GLYPH: Record<Course, React.ReactNode> = {
  beverage: (
    <>
      <path d="M38 34 h24 l-3 26 a9 9 0 0 1 -18 0 z" />
      <path d="M50 34 v-9" />
      <path d="M62 41 h6 a6 6 0 0 1 0 12 h-5" />
    </>
  ),
  starter: (
    <>
      <circle cx="50" cy="50" r="7" />
      <circle cx="36" cy="42" r="5" />
      <circle cx="63" cy="43" r="5" />
      <circle cx="43" cy="62" r="5" />
      <circle cx="60" cy="60" r="4" />
    </>
  ),
  tiffin: (
    <>
      <path d="M28 58 a22 22 0 0 1 44 0" />
      <path d="M24 58 h52" />
      <path d="M50 36 v-8" />
    </>
  ),
  soup: (
    <>
      <path d="M30 46 h40 a20 20 0 0 1 -40 0 z" />
      <path d="M42 36 q4 -6 0 -12" />
      <path d="M52 36 q4 -6 0 -12" />
      <path d="M62 36 q4 -6 0 -12" />
    </>
  ),
  main: (
    <>
      <circle cx="50" cy="50" r="15" />
      <path d="M50 35 v30 M35 50 h30" />
    </>
  ),
  rice: (
    <>
      <path d="M32 54 a18 12 0 0 1 36 0 z" />
      <path d="M40 44 q10 -7 20 0" />
      <path d="M36 62 h28" />
    </>
  ),
  bread: (
    <>
      <circle cx="50" cy="50" r="17" />
      <path d="M37 42 q13 9 26 0" />
      <path d="M37 55 q13 9 26 0" />
    </>
  ),
  side: (
    <>
      <rect x="34" y="34" width="32" height="32" rx="4" />
      <path d="M34 50 h32 M50 34 v32" />
    </>
  ),
  accompaniment: (
    <>
      <circle cx="50" cy="50" r="13" />
      <circle cx="50" cy="50" r="5" />
    </>
  ),
  dessert: (
    <>
      <path d="M50 32 l6 14 15 1 -11 10 3 15 -13 -8 -13 8 3 -15 -11 -10 15 -1 z" />
    </>
  ),
}

interface Props {
  name: string
  id: string
  course: Course[]
  src: string | null
  blurDataUrl?: string | null
  /** Card grid vs. the larger modal/hero treatment. */
  size?: 'card' | 'feature'
  /**
   * Print the dish name inside the tile. Off by default — in a card and in the
   * modal there is already a heading right beneath it, and repeating the name
   * twenty rows down a grid looks like a bug. On only where the tile itself has
   * to carry the name, such as the home page preview strip.
   */
  showLabel?: boolean
  sizes?: string
  priority?: boolean
  className?: string
}

export function DishImage({
  name, id, course, src, blurDataUrl,
  size = 'card', showLabel = false, sizes, priority = false, className = '',
}: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        priority={priority}
        sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        placeholder={blurDataUrl ? 'blur' : 'empty'}
        blurDataURL={blurDataUrl ?? undefined}
        className={`object-cover ${className}`}
      />
    )
  }

  const h = hash(id)
  const hue = HUES[h % HUES.length]
  // ±7% keeps tiles distinguishable side by side without any reading as an error.
  const drift = ((h >> 9) % 15) - 7
  const primary = course[0] ?? 'main'
  const isFeature = size === 'feature'
  const stroke = `hsl(${hue} 55% 74%)`

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: `
          radial-gradient(105% 80% at 50% 8%, hsl(${hue} ${38 + drift}% 24%) 0%, transparent 66%),
          linear-gradient(168deg, hsl(${hue} 26% 16%) 0%, #1B1613 62%, hsl(${(hue + 12) % 360} 22% 13%) 100%)
        `,
      }}
    >
      {/* The plate. Centred and generously sized so it reads as a mark rather
          than a texture, at an opacity that never competes with the label. */}
      <svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: isFeature ? '48%' : '62%',
          height: isFeature ? '48%' : '62%',
          maxWidth: '210px',
          opacity: 0.17,
        }}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="50" r="46" strokeWidth={1.1} />
        <circle cx="50" cy="50" r="38" strokeWidth={0.8} opacity={0.6} />
        {GLYPH[primary]}
      </svg>

      {/* A warm bloom from the lower right, so the tile has a light source
          rather than reading as a flat swatch. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(75% 55% at 84% 100%, rgba(217,133,63,.20), transparent 72%)',
        }}
      />

      {showLabel ? (
        <>
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(20,16,13,.80) 0%, transparent 56%)' }}
          />
          <div className={`relative h-full flex flex-col justify-end ${isFeature ? 'p-7' : 'p-4'}`}>
            <p
              className="font-display text-[var(--dark-ink)]"
              style={{
                fontSize: isFeature ? '28px' : '18px',
                fontWeight: 500,
                lineHeight: 1.16,
                textWrap: 'balance',
              }}
            >
              {name}
            </p>
            <p
              className="uppercase font-semibold mt-1.5"
              style={{ fontSize: '10px', letterSpacing: '.17em', color: `hsl(${hue} 38% 66%)` }}
            >
              {COURSE_LABELS[primary]}
            </p>
          </div>
        </>
      ) : (
        // Without a label the tile still needs one piece of information, or it
        // is just a coloured rectangle. The course is the useful one.
        <p
          className="absolute bottom-3.5 left-4 uppercase font-semibold"
          style={{ fontSize: '9.5px', letterSpacing: '.19em', color: `hsl(${hue} 32% 58%)` }}
        >
          {COURSE_LABELS[primary]}
        </p>
      )}
    </div>
  )
}
