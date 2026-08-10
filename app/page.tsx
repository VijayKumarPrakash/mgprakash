import Link from 'next/link'
import { getAllDishes } from '@/lib/dishes'
import { Reveal } from '@/components/Reveal'
import { DishImage } from '@/components/catalogue/DishImage'
import { COURSE_LABELS } from '@/lib/taxonomy'
import type { Course } from '@/lib/taxonomy'
import type { Dish } from '@/types'

// See the note in app/menu/page.tsx — these pages are dynamic because the nav
// reads the session, so caching lives in lib/dishes.ts rather than in ISR.

const PILLARS = [
  {
    label: 'Since 2000',
    title: 'Twenty-five years of Bengaluru weddings',
    body: 'Hundreds of families, from Rajajinagar house functions to reception halls across the city.',
  },
  {
    label: 'The kitchen',
    title: 'Karnataka first, then everywhere else',
    body: 'Udupi and North Karnataka cooking done properly, alongside Punjabi, Mughlai and Indo-Chinese.',
  },
  {
    label: 'Every table',
    title: 'Pure veg, Jain and satvik, without fuss',
    body: 'Filter the whole catalogue by diet, or by dishes made without onion and garlic.',
  },
]

export default async function HomePage() {
  let dishes: Dish[] = []
  try {
    dishes = await getAllDishes()
  } catch {
    // Catalogue unreachable — the page still renders, just without the preview strip.
  }

  const total = dishes.length

  // One dish per course rather than the first six in the list — otherwise the
  // strip fills with whatever course happens to sort first and the home page
  // advertises the catering business with six soft drinks.
  const SHOWCASE: Course[] = ['main', 'starter', 'tiffin', 'rice', 'dessert', 'bread']
  const preview = SHOWCASE
    .map(course => {
      const inCourse = dishes.filter(d => d.course[0] === course)
      return (
        inCourse.find(d => d.tags.includes('banquet-staple')) ??
        inCourse.find(d => d.tags.includes('crowd-pleaser')) ??
        inCourse[0]
      )
    })
    .filter((d): d is Dish => !!d)

  const courseCounts = Object.entries(
    dishes.reduce<Record<string, number>>((acc, d) => {
      for (const c of d.course) acc[c] = (acc[c] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <>
      {/* ================= HERO ================= */}
      {/* -mt-[68px] + pt pulls the section under the transparent sticky nav so
          the dark ground runs edge to edge behind it. */}
      <section className="on-dark relative -mt-[68px] pt-[68px] overflow-hidden bg-[var(--dark)] text-[var(--dark-ink)]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(70% 90% at 82% -10%, rgba(217,133,63,.22), transparent 62%),
              radial-gradient(50% 60% at 8% 110%, rgba(166,61,23,.20), transparent 68%),
              linear-gradient(158deg, #241F1A 0%, #1A1512 55%, #201A15 100%)
            `,
          }}
        />

        {/* Ornament. Until there is real photography the right half of a hero
            this size reads as an accident, so it gets the same thali line-art
            language as the placeholder tiles — one large plate, drawn not
            photographed. Pure SVG, no request, and hidden below lg where the
            text needs the full width anyway. */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute right-[-6%] top-1/2 -translate-y-1/2 w-[560px] h-[560px] pointer-events-none"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="#D9853F" strokeLinecap="round">
            <g opacity="0.20">
              <circle cx="100" cy="100" r="94" strokeWidth="0.7" />
              <circle cx="100" cy="100" r="80" strokeWidth="0.5" opacity="0.7" />
              <circle cx="100" cy="100" r="34" strokeWidth="0.9" />
              <circle cx="100" cy="100" r="26" strokeWidth="0.5" opacity="0.7" />
              {/* Katoris around the rim, the way a banquet thali is actually laid. */}
              {Array.from({ length: 7 }, (_, i) => {
                const a = (i / 7) * Math.PI * 2 - Math.PI / 2
                return (
                  <g key={i}>
                    <circle cx={100 + Math.cos(a) * 57} cy={100 + Math.sin(a) * 57} r="14" strokeWidth="0.8" />
                    <circle cx={100 + Math.cos(a) * 57} cy={100 + Math.sin(a) * 57} r="9" strokeWidth="0.45" opacity="0.65" />
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <p className="eyebrow text-[var(--dark-ink-3)] mb-7">Established 2000 · Bengaluru</p>

            <h1 className="font-display text-[clamp(38px,7vw,74px)] text-balance mb-7" style={{ fontWeight: 500 }}>
              Catering crafted for every occasion
            </h1>

            <p className="text-[19px] leading-[1.62] text-[var(--dark-ink-2)] max-w-[46ch] mb-10">
              From a naming ceremony at home to a reception for six hundred — South and
              North Indian cooking, prepared fresh on the day and served with care.
            </p>

            <div className="flex flex-wrap gap-3.5">
              <Link href="/order/new" className="btn btn-primary px-8 py-3.5 text-[15px]">
                Build your menu
              </Link>
              <Link href="/menu" className="btn btn-secondary px-8 py-3.5 text-[15px]">
                Browse {total > 0 ? `${total} dishes` : 'the catalogue'}
              </Link>
            </div>
          </div>
        </div>

        {/* Course counts, doubling as proof the catalogue is real. */}
        {courseCounts.length > 0 && (
          <div className="relative border-t border-[var(--dark-line)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <ul className="flex gap-8 sm:gap-12 overflow-x-auto scrollbar-none py-6">
                {courseCounts.map(([course, n]) => (
                  <li key={course} className="flex-shrink-0">
                    <p className="font-display text-[26px] leading-none text-[var(--accent-lift)]" style={{ fontWeight: 500 }}>
                      {n}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[var(--dark-ink-3)] mt-1.5">
                      {COURSE_LABELS[course as keyof typeof COURSE_LABELS] ?? course}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ================= PILLARS ================= */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="grid gap-10 sm:gap-8 sm:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.label} delay={i * 90}>
                <div className="border-l-2 pl-6 h-full" style={{ borderColor: 'var(--accent)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[var(--ink-3)] mb-2.5">
                    {p.label}
                  </p>
                  <h3 className="font-display text-[21px] leading-[1.28] text-[var(--ink)] mb-2 text-balance">
                    {p.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.6] text-[var(--ink-2)]">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PREVIEW STRIP ================= */}
      {preview.length > 0 && (
        <section className="bg-[var(--surface)] border-y border-[var(--line)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <Reveal>
              <div className="flex items-end justify-between gap-6 flex-wrap mb-9">
                <div>
                  <h2 className="font-display text-[clamp(28px,4vw,40px)] text-[var(--ink)] mb-1.5">
                    From the catalogue
                  </h2>
                  <p className="text-[15px] text-[var(--ink-3)]">
                    A few of the dishes that turn up at most tables.
                  </p>
                </div>
                <Link href="/menu" className="btn btn-secondary btn-sm">
                  See all {total} dishes
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {preview.map((d, i) => (
                <Reveal key={d.id} delay={i * 60} as="article">
                  <Link
                    href="/menu"
                    className="group block relative aspect-[4/3] rounded-[var(--r-lg)] overflow-hidden bg-[var(--dark-2)]
                               transition-transform duration-[var(--dur-base)] ease-[cubic-bezier(.22,1,.36,1)]
                               hover:-translate-y-1 active:translate-y-0 active:scale-[.99]"
                  >
                    <DishImage
                      id={d.id}
                      name={d.name}
                      course={d.course}
                      src={d.image_url}
                      blurDataUrl={d.blur_data_url}
                      showLabel
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.05]"
                    />
                    {d.image_url && (
                      <>
                        <div
                          aria-hidden="true"
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(to top, rgba(20,16,13,.82) 0%, transparent 58%)' }}
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="font-display text-[18px] text-[var(--dark-ink)] text-balance" style={{ fontWeight: 500 }}>
                            {d.name}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--dark-ink-3)] mt-1">
                            {d.cuisine}
                          </p>
                        </div>
                      </>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= CTA ================= */}
      <section className="on-dark relative overflow-hidden bg-[var(--dark)] text-[var(--dark-ink)]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(60% 120% at 88% 50%, rgba(217,133,63,.20), transparent 66%),
              linear-gradient(120deg, #1A1512 0%, #241F1A 100%)
            `,
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-display text-[clamp(27px,4vw,38px)] text-balance mb-2.5">
              Ready to plan your event?
            </h2>
            <p className="text-[16px] leading-[1.6] text-[var(--dark-ink-2)]">
              Tell us the date, the headcount and the occasion. Pick your dishes, and
              we&rsquo;ll send a written quote the same day.
            </p>
          </div>
          <Link href="/order/new" className="btn btn-primary px-8 py-3.5 text-[15px] flex-shrink-0">
            Get a Quote
          </Link>
        </div>
      </section>
    </>
  )
}
