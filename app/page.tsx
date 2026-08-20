import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllDishes } from '@/lib/dishes'
import { Reveal } from '@/components/Reveal'
import { DishImage } from '@/components/catalogue/DishImage'
import { COURSE_LABELS } from '@/lib/taxonomy'
import { BUSINESS, yearsTrading } from '@/lib/business'
import { faqSchema, graph, jsonLdScript, SITE_URL } from '@/lib/seo'
import type { Course } from '@/lib/taxonomy'
import type { Dish } from '@/types'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: SITE_URL },
}

/**
 * Real pre-quote questions, answered properly.
 *
 * These earn their place twice. As FAQPage structured data they are eligible
 * for expansion under the search result, which takes up more of the page than
 * a plain listing does. And as page copy they are the only place on the home
 * page that uses the words people search — "cooking contractor", "how much",
 * "how many days notice" — because the hero deliberately does not.
 *
 * Answers must match the visible text exactly. Marking up an answer that is not
 * on the page is a structured-data violation, not a shortcut — which is also
 * why this is one function feeding both the JSON-LD and the rendered list, and
 * why the dish count is a parameter rather than a number typed into the prose.
 */
const faqs = (dishCount: number) => [
  {
    q: 'What is a cooking contractor?',
    a:
      'In Bengaluru, a cooking contractor cooks your food for the occasion rather than delivering it ' +
      'from a central kitchen — the team, the vessels and the burners come to you, and the meal is ' +
      'made on site and served fresh. M G Prakash has worked this way since 2000. Where a venue has ' +
      'no room, no water or no gas point, we cook in a godown instead and bring the food to you hot.',
  },
  {
    q: 'Can we buy the groceries ourselves, or do you handle everything?',
    a:
      'Either. Many families prefer to buy the provisions themselves, and some traditions expect it — ' +
      'in that case we give you an itemised list with quantities worked out for your headcount and ' +
      'cook with what you have bought. Or we take the whole thing end to end: groceries, vessels on ' +
      'rent, the gas connection, transport, the team and the serving. You can also choose to have us ' +
      'cook and nothing more, or cook and serve. Whichever you pick, you get the menu, the itemised ' +
      'provisions list and the vessels list.',
  },
  {
    q: 'How much does catering cost per plate?',
    a:
      'It depends on the menu, the headcount, the venue and how much of the work you are handing ' +
      'over, so we quote rather than publish a rate card. A non-vegetarian menu costs more per plate ' +
      'than a vegetarian one, because the ingredients cost more and the cooking and service have to ' +
      'be kept separate. Pick your dishes on the site and the quote is written, free and comes with ' +
      'a PDF of the menu exactly as you chose it.',
  },
  {
    q: 'How much notice do you need?',
    a:
      'A few weeks at minimum, and months rather than weeks for a wedding or anything in festival ' +
      'season — the dates go early. We accept only one work order a day, so once a date is taken it ' +
      'is taken: one function, one kitchen, one team, the whole day. Condolence meals are the ' +
      'exception and always will be — call rather than use the form for those.',
  },
  {
    q: 'Do you do regular or daily catering?',
    a:
      'No. We cater one-off events — a wedding, a naming ceremony, a housewarming, a festival ' +
      'annadana, a company lunch. We do not take on running contracts: no daily meals for a paying ' +
      'guest house or hostel, no office canteen, no weekly tiffin. That needs a kitchen organised ' +
      'around repetition, and this one is organised around getting a single occasion exactly right.',
  },
  {
    q: 'Do you cater pure vegetarian, Jain and satvik menus?',
    a:
      'Yes, and they are treated as first-class filters rather than special requests. Every one of ' +
      `our ${dishCount} dishes is tagged for vegetarian, vegan and Jain suitability, and onion and ` +
      'garlic are tracked separately — so a satvik menu for a naming ceremony or temple event can ' +
      'exclude alliums without applying full Jain rules on root vegetables.',
  },
  {
    q: 'How many guests can you cater for?',
    a:
      'There is no minimum — we have cooked for as few as five people. At the other end, festival ' +
      'annadana meals for well over five thousand have gone out of this kitchen. Most weddings fall ' +
      'between two hundred and six hundred guests, and the kitchen scales well past that.',
  },
  {
    q: 'Which areas of Bangalore do you serve?',
    a:
      'All of Bengaluru, from our base in Rajajinagar — Malleshwaram, Basaveshwaranagar, ' +
      'Vijayanagar, Jayanagar, Basavanagudi, Indiranagar, Koramangala, Whitefield, Hebbal and ' +
      'everywhere between. We also travel across Karnataka and South India for weddings and ' +
      'larger functions.',
  },
  {
    q: 'Do you serve both vegetarian and non-vegetarian at the same event?',
    a:
      'Yes. We ask for a veg and non-veg headcount separately when you request a quote, and the two ' +
      'are cooked and served separately at the venue, with every dish clearly labelled. The two ' +
      'headcounts also matter to the price, since a non-vegetarian plate costs more than a ' +
      'vegetarian one.',
  },
  {
    q: 'Do I need an account to request a quote?',
    a:
      'No. The quote form works without signing in. Signing in with Google only pre-fills your ' +
      'contact details and lets you find past requests later.',
  },
] as const

// See the note in app/menu/page.tsx — these pages are dynamic because the nav
// reads the session, so caching lives in lib/dishes.ts rather than in ISR.

const PILLARS = [
  {
    label: `Since ${BUSINESS.established}`,
    // Derived, not written. This read "Twenty-five years" a year past the point
    // it was true — see yearsTrading() in lib/business.ts.
    title: `${yearsTrading()} years of Bengaluru weddings`,
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
  const faqList = faqs(total)

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(graph(faqSchema(faqList.map(f => ({ ...f })))))}
      />

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

            {/* Carries "cooking contractor" and "Bengaluru" in the first
                paragraph of the page. The h1 above is deliberately the mood
                line and matches nothing anyone searches for, so this is where
                the page states plainly what the business is and where it is. */}
            <p className="text-[19px] leading-[1.62] text-[var(--dark-ink-2)] max-w-[46ch] mb-10">
              A cooking contractor and caterer in Bengaluru since {BUSINESS.established}. From a
              naming ceremony at home to a function for five thousand — South and North Indian
              cooking, prepared fresh on the day and served with care.
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

      {/* ================= FAQ ================= */}
      {/* Native <details> rather than a state-driven accordion: it is keyboard
          accessible and findable by in-page search for free, it needs no
          JavaScript, and — the part that matters here — the answer text is in
          the DOM whether or not the panel is open, so a crawler reads all eight
          answers and the FAQPage markup above is corroborated by the page. */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <Reveal>
            <p className="eyebrow text-[var(--ink-3)] mb-4">Before you ask</p>
            <h2 className="font-display text-[clamp(28px,4vw,40px)] text-[var(--ink)] mb-9 text-balance">
              Questions we get every week
            </h2>
          </Reveal>

          {/*
            Deliberately NOT wrapped in <Reveal>, unlike every other block on
            this page. `.reveal` sets `opacity: 0` and waits for an
            IntersectionObserver to add `.reveal-in` — decorative sections can
            afford that, but a FAQPage rich result requires the answer to be
            visible on the page, and "invisible until JavaScript says otherwise"
            is not a guarantee worth betting the markup on. These eight answers
            are the one place on the site where paint reliability outranks the
            reveal animation.
          */}
          <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqList.map(faq => (
              <details key={faq.q} className="group py-5">
                <summary
                  className="flex items-start justify-between gap-5 cursor-pointer list-none
                             text-[16.5px] font-medium text-[var(--ink)] leading-[1.45]
                             hover:text-[var(--accent)] transition-colors duration-[var(--dur-fast)]"
                >
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className="mt-1.5 flex-shrink-0 w-3 h-3 text-[var(--ink-3)]
                               transition-transform duration-[var(--dur-base)] ease-[cubic-bezier(.22,1,.36,1)]
                               group-open:rotate-180"
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
                      <path d="M1.5 4L6 8.5L10.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <p className="text-[15px] leading-[1.7] text-[var(--ink-2)] mt-3 pr-8">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          <p className="text-[15px] text-[var(--ink-2)] mt-8">
            Still unsure?{' '}
            <Link
              href="/services"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 transition-colors"
            >
              See everything we cater
            </Link>
            , or{' '}
            <Link
              href="/areas"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 transition-colors"
            >
              check whether we cover your area
            </Link>
            .
          </p>
        </div>
      </section>

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
