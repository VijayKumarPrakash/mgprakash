import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllDishes, getDishCount } from '@/lib/dishes'
import { CatalogueClient } from '@/components/catalogue/CatalogueClient'
import { COURSES, COURSE_LABELS } from '@/lib/taxonomy'
import { absoluteUrl, breadcrumbSchema, graph, jsonLdScript, ID } from '@/lib/seo'

// No `revalidate` export: the root layout renders <Nav />, which reads the
// session cookie, so every page in the tree is dynamic and an ISR window here
// would be silently ignored. The catalogue is cached in lib/dishes.ts instead.

/**
 * `generateMetadata` rather than a static `metadata` export, so the dish count
 * in the title and description is the real one. Hardcoded, it would have gone
 * stale the first time a dish was added — and a title advertising the wrong
 * number is worse than one carrying no number at all.
 */
export async function generateMetadata(): Promise<Metadata> {
  const count = await getDishCount()
  const title = `Full Menu — ${count} South & North Indian Dishes`

  return {
    title,
    description:
      `The full M G Prakash Catering menu — ${count} Karnataka, Udupi, South Indian, North Indian, ` +
      'Mughlai and Indo-Chinese dishes for weddings and events in Bengaluru. Filter by course, diet, ' +
      'cuisine and occasion, including pure veg, Jain and no onion-garlic.',
    alternates: { canonical: '/menu' },
    openGraph: { url: absoluteUrl('/menu'), title },
  }
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function MenuPage({ searchParams }: Props) {
  const dishes = await getAllDishes()
  const { q } = await searchParams

  /**
   * The A–Z index below groups by first course, so the same grouping drives
   * both it and the `Menu` schema. One pass, one source.
   */
  const byCourse = COURSES.map(course => ({
    course,
    label: COURSE_LABELS[course],
    dishes: dishes.filter(d => d.course[0] === course),
  })).filter(section => section.dishes.length > 0)

  const pageGraph = graph(
    {
      '@type': 'Menu',
      '@id': `${absoluteUrl('/menu')}#menu`,
      name: 'M G Prakash Catering — full menu',
      url: absoluteUrl('/menu'),
      inLanguage: 'en-IN',
      provider: { '@id': ID.business },
      hasMenuSection: byCourse.map(section => ({
        '@type': 'MenuSection',
        name: section.label,
        numberOfItems: section.dishes.length,
        // Referenced by URL rather than inlined. Inlining 229 MenuItems with
        // descriptions would add roughly 80KB of JSON to every render of this
        // page for no gain — each dish already serves its own MenuItem node at
        // the URL below, which is what Google will fetch and merge.
        hasMenuItem: section.dishes.map(d => ({
          '@type': 'MenuItem',
          '@id': `${absoluteUrl(`/menu/${d.id}`)}#menuitem`,
          name: d.name,
          url: absoluteUrl(`/menu/${d.id}`),
        })),
      })),
    },
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Menu', path: '/menu' },
    ])
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(pageGraph)} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="eyebrow text-[var(--ink-3)] mb-4">The catalogue</p>
          <h1 className="font-display text-[clamp(32px,5vw,48px)] text-[var(--ink)] mb-3 text-balance">
            Everything we cook
          </h1>
          <p className="text-[16px] leading-[1.62] text-[var(--ink-2)]">
            {dishes.length} dishes across Karnataka, the wider South, the North, and a little
            Indo-Chinese. Search by name or ingredient, or filter down to exactly what your
            event needs — including pure veg, Jain, and dishes made without onion or garlic.
          </p>
        </header>

        <CatalogueClient dishes={dishes} initialQuery={q ?? ''} />

        {/*
          The crawlable index.

          The grid above is a client component that paginates twelve at a time,
          so a crawler executing no JavaScript sees a dozen dish names and no
          links at all — the other 217 dishes and every one of their pages would
          be reachable only from the sitemap. This list is plain server-rendered
          anchors, which is what actually distributes internal link equity to
          the dish pages and gives Google a path to them.

          It is visible and genuinely useful rather than hidden: a hidden link
          farm is a spam signal, and someone who knows the dish they want should
          not have to fight a search box for it.
        */}
        <section className="mt-20 pt-12 border-t border-[var(--line)]">
          <h2 className="font-display text-[28px] text-[var(--ink)] mb-2">
            Every dish, by course
          </h2>
          <p className="text-[15px] text-[var(--ink-3)] mb-8 max-w-2xl">
            The complete list. Each dish has its own page with ingredients and
            the occasions it suits.
          </p>

          <div className="space-y-9">
            {byCourse.map(section => (
              <div key={section.course}>
                <h3 className="text-[11px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-3">
                  {section.label}
                  <span className="ml-2 font-medium normal-case tracking-normal text-[var(--ink-3)] opacity-70">
                    {section.dishes.length}
                  </span>
                </h3>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-1.5">
                  {section.dishes.map(d => (
                    <li key={d.id}>
                      <Link
                        href={`/menu/${d.id}`}
                        className="text-[14px] leading-[1.5] text-[var(--ink-2)] hover:text-[var(--accent)]
                                   underline-offset-2 hover:underline transition-colors duration-[var(--dur-fast)]"
                      >
                        {d.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
