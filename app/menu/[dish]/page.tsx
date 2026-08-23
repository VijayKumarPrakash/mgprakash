import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDishById, getRelatedDishes } from '@/lib/dishes'
import { DishImage } from '@/components/catalogue/DishImage'
import { AddToQuoteButton } from '@/components/catalogue/AddToQuoteButton'
import { DietBadge } from '@/components/catalogue/DietBadge'
import { COURSE_LABELS, OCCASION_LABELS, LICENCES_REQUIRING_CREDIT } from '@/lib/taxonomy'
import { absoluteUrl, breadcrumbSchema, graph, jsonLdScript } from '@/lib/seo'
import { BUSINESS } from '@/lib/business'
import type { Dish } from '@/types'

/**
 * A real, crawlable page per dish.
 *
 * The catalogue is a single client component: 229 dishes rendered into one
 * route, with detail living in a modal that has no URL. That is a good browsing
 * experience and it is completely invisible to a search engine — the whole
 * catalogue was one indexable page, so the site could never appear for
 * "bisi bele bath catering bengaluru" or any of the several hundred other
 * queries the data already answers.
 *
 * These pages do not replace the modal. /menu still opens a dish in place for
 * anyone browsing; this is the same content at a durable address, which is also
 * what makes a dish linkable in a WhatsApp thread.
 *
 * No `generateStaticParams`. The root layout renders <Nav />, which reads the
 * session cookie, so every route in the tree is dynamic and static params would
 * be silently ignored — the same reason /menu carries no `revalidate`. The
 * hour-long module cache in lib/dishes.ts is what keeps this cheap.
 */

interface Props {
  params: Promise<{ dish: string }>
}

/** schema.org has vocabulary for two of our four diet flags. Only claim those. */
function suitableForDiet(dish: Dish): string[] {
  const diets: string[] = []
  if (dish.diet === 'vegetarian') diets.push('https://schema.org/VegetarianDiet')
  if (dish.is_vegan) diets.push('https://schema.org/VeganDiet')
  return diets
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dish: id } = await params
  const dish = await getDishById(id)
  if (!dish) return { title: 'Dish not found' }

  const course = COURSE_LABELS[dish.course[0]] ?? 'dish'
  const path = `/menu/${dish.id}`

  /**
   * Descriptions are capped near 155 characters because that is roughly where
   * Google truncates. The dish description is written first and the context
   * appended, so a clipped snippet still loses the least useful half.
   */
  const description = `${dish.description} ${dish.name} for weddings and events in Bengaluru, catered by ${BUSINESS.name}.`

  return {
    title: `${dish.name} — Catering in Bengaluru`,
    description: description.length > 158 ? `${description.slice(0, 155).trimEnd()}…` : description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: `${dish.name} — ${dish.cuisine} ${course}`,
      description: dish.description,
      url: absoluteUrl(path),
      ...(dish.image_url ? { images: [{ url: dish.image_url, alt: dish.name }] } : {}),
    },
  }
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-1">
        {label}
      </dt>
      <dd className="text-[14px] text-[var(--ink)]">{value}</dd>
    </div>
  )
}

export default async function DishPage({ params }: Props) {
  const { dish: id } = await params
  const dish = await getDishById(id)
  if (!dish) notFound()

  const related = await getRelatedDishes(dish)
  const path = `/menu/${dish.id}`
  const courseLabel = COURSE_LABELS[dish.course[0]] ?? ''

  const needsCredit =
    dish.image_credit && LICENCES_REQUIRING_CREDIT.includes(dish.image_licence)

  const diets = suitableForDiet(dish)

  /**
   * `MenuItem` rather than `Recipe`. Recipe requires ingredient quantities and
   * a method, and demands `recipeYield` and instructions to be eligible for the
   * rich result — claiming it without those is a structured-data error, and
   * this is a catering catalogue, not a cookbook. MenuItem is the honest type
   * and it links cleanly back to the Caterer node in the root layout.
   *
   * No `offers` node. There was one, carrying a currency and an empty
   * PriceSpecification but no price, which Search Console reports as "missing
   * field price" across all 229 pages. The instinct was right — a quote depends
   * on headcount and venue, and an invented figure in an Offer is the exact
   * mismatch that earns a manual action — but a half-populated Offer is worse
   * than none at all. The `ReserveAction` on the Caterer node in the root
   * layout is what points a searcher at the quote form.
   */
  const pageGraph = graph(
    {
      '@type': 'MenuItem',
      '@id': `${absoluteUrl(path)}#menuitem`,
      name: dish.name,
      alternateName: dish.alt_names.length ? dish.alt_names : undefined,
      description: dish.description,
      url: absoluteUrl(path),
      // Images are self-hosted under /dishes today, but fetch-images can leave a
      // Commons URL in place while a photo is being previewed. Schema needs an
      // absolute URL either way, and absoluteUrl would mangle one that already is.
      ...(dish.image_url
        ? { image: dish.image_url.startsWith('http') ? dish.image_url : absoluteUrl(dish.image_url) }
        : {}),
      suitableForDiet: diets.length ? diets : undefined,
    },
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Menu', path: '/menu' },
      { name: dish.name, path },
    ])
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(pageGraph)} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Visible breadcrumb, matching the BreadcrumbList above. Google will
            only render the trail in a result if the markup is corroborated by
            something on the page. */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-[13px] text-[var(--ink-3)] flex-wrap">
            <li>
              <Link href="/" className="hover:text-[var(--ink)] transition-colors">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/menu" className="hover:text-[var(--ink)] transition-colors">Menu</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-[var(--ink-2)]" aria-current="page">{dish.name}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
          <div className="relative aspect-[4/3] rounded-[var(--r-lg)] overflow-hidden bg-[var(--dark-2)]">
            <DishImage
              id={dish.id}
              name={dish.name}
              course={dish.course}
              src={dish.image_url}
              blurDataUrl={dish.blur_data_url}
              size="feature"
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div className="absolute top-4 left-4 z-10">
              <DietBadge dish={dish} variant="on-image" />
            </div>
          </div>

          <div>
            <p className="eyebrow text-[var(--ink-3)] mb-3">
              {dish.cuisine}
              {courseLabel && ` · ${courseLabel}`}
            </p>

            <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.12] text-[var(--ink)] mb-3 text-balance">
              {dish.name}
            </h1>

            {dish.alt_names.length > 0 && (
              <p className="text-[14px] text-[var(--ink-3)] italic mb-4">
                Also known as {dish.alt_names.join(', ')}
              </p>
            )}

            <p className="text-[16px] leading-[1.65] text-[var(--ink-2)] mb-6">
              {dish.description}
            </p>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-6 border-y border-[var(--line)] mb-6">
              <Fact label="Course" value={dish.course.map(c => COURSE_LABELS[c]).join(' · ')} />
              <Fact label="Cuisine" value={dish.cuisine} />
              <Fact
                label="Method"
                value={<span className="capitalize">{dish.cooking_method.join(', ').replace(/-/g, ' ')}</span>}
              />
              {dish.region_of_origin && <Fact label="Region" value={dish.region_of_origin} />}
            </dl>

            <div className="flex flex-wrap gap-3">
              <AddToQuoteButton dishId={dish.id} className="btn btn-primary px-6 py-3">
                Add this to a quote
              </AddToQuoteButton>
              <Link href="/menu" className="btn btn-secondary px-6 py-3">
                Browse all dishes
              </Link>
            </div>
          </div>
        </div>

        {/* ---------- Detail ---------- */}
        <div className="grid sm:grid-cols-2 gap-8 mt-14">
          {dish.ingredients.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2.5">
                Ingredients
              </h2>
              <p className="text-[14.5px] leading-[1.7] text-[var(--ink-2)] capitalize">
                {dish.ingredients.join(', ')}
              </p>
            </section>
          )}

          {dish.flavour_profile.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2.5">
                Flavour
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {dish.flavour_profile.map(f => (
                  <span
                    key={f}
                    className="text-[12px] font-medium capitalize rounded-full px-3 py-1
                               bg-[var(--accent-soft)] text-[color-mix(in_srgb,var(--accent)_82%,black)]
                               border border-[var(--accent-line)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>
          )}

          {dish.occasion_fit.length > 0 && (
            <section className="sm:col-span-2">
              <h2 className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--ink-3)] mb-2.5">
                Served at
              </h2>
              <p className="text-[14.5px] leading-[1.7] text-[var(--ink-2)]">
                {dish.name} is a regular on our menus for{' '}
                {dish.occasion_fit.map(o => OCCASION_LABELS[o].toLowerCase()).join(', ')} across
                Bengaluru — and anywhere in South India we travel to.
              </p>
            </section>
          )}
        </div>

        {needsCredit && (
          <p className="text-[11px] text-[var(--ink-3)] mt-10">
            Photograph:{' '}
            {dish.image_source_url ? (
              <a
                href={dish.image_source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline underline-offset-2 hover:text-[var(--ink-2)] transition-colors"
              >
                {dish.image_credit}
              </a>
            ) : (
              dish.image_credit
            )}{' '}
            ({dish.image_licence.toUpperCase()})
          </p>
        )}

        {/* ---------- Related ---------- */}
        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-[var(--line)]">
            <h2 className="font-display text-[26px] text-[var(--ink)] mb-6">
              Often served alongside
            </h2>
            <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {related.map(r => (
                <li key={r.id}>
                  <Link
                    href={`/menu/${r.id}`}
                    className="group block relative aspect-[4/3] rounded-[var(--r-md)] overflow-hidden bg-[var(--dark-2)]
                               transition-transform duration-[var(--dur-base)] ease-[cubic-bezier(.22,1,.36,1)]
                               hover:-translate-y-1"
                  >
                    <DishImage
                      id={r.id}
                      name={r.name}
                      course={r.course}
                      src={r.image_url}
                      blurDataUrl={r.blur_data_url}
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.05]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(20,16,13,.85) 0%, transparent 60%)' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="font-display text-[16px] text-[var(--dark-ink)] text-balance" style={{ fontWeight: 500 }}>
                        {r.name}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--dark-ink-3)] mt-0.5">
                        {r.cuisine}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
