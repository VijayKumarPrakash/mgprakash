import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS, ADDRESS_LINE, SERVICE_AREAS, TEL_HREF } from '@/lib/business'
import { absoluteUrl, breadcrumbSchema, graph, jsonLdScript, ID } from '@/lib/seo'

/**
 * Where the kitchen travels.
 *
 * The honest version of a "areas we serve" page. The usual version of this page
 * is a wall of neighbourhood names with a sentence each, spun from a template —
 * which is a doorway page, reads as one to a human, and is precisely what
 * Google's helpful-content system was built to demote. This one keeps the two
 * tiers separate and says plainly what changes between them, because the
 * distinction is real: a Rajajinagar function and a Kochi wedding are not the
 * same booking, and pretending otherwise costs a customer their morning.
 */

export const metadata: Metadata = {
  title: 'Areas We Serve — Bengaluru & South India',
  description:
    'M G Prakash Catering serves all of Bengaluru from Rajajinagar — Malleshwaram, Vijayanagar, ' +
    'Jayanagar, Basavanagudi, Indiranagar, Whitefield and beyond — and travels across Karnataka ' +
    'and South India for weddings and large functions.',
  alternates: { canonical: '/areas' },
  openGraph: { url: absoluteUrl('/areas'), title: 'Areas We Serve — Bengaluru & South India' },
}

export default function AreasPage() {
  const pageGraph = graph(
    {
      '@type': 'WebPage',
      '@id': `${absoluteUrl('/areas')}#webpage`,
      url: absoluteUrl('/areas'),
      name: 'Areas served — Bengaluru and South India',
      isPartOf: { '@id': ID.website },
      about: { '@id': ID.business },
    },
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Areas served', path: '/areas' },
    ])
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(pageGraph)} />

      <section className="on-dark bg-[var(--dark)] text-[var(--dark-ink)] -mt-[68px] pt-[68px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <p className="eyebrow text-[var(--dark-ink-3)] mb-6">Based in Rajajinagar</p>
          <h1 className="font-display text-[clamp(32px,6vw,56px)] leading-[1.1] text-balance mb-6">
            Where we cook
          </h1>
          <p className="text-[18px] leading-[1.62] text-[var(--dark-ink-2)] max-w-[52ch]">
            The kitchen is on 10th Cross Road in Rajajinagar, and most of our work is within
            Bengaluru. For weddings and larger functions we travel — across Karnataka, and to
            most of South India.
          </p>
        </div>
      </section>

      {/* ---------- Bengaluru ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-3 text-balance">
            Across Bengaluru
          </h2>
          <p className="text-[16px] leading-[1.65] text-[var(--ink-2)] max-w-[58ch] mb-8">
            Anywhere inside the city, same day, no travel charge. We are closest to the west and
            north — Rajajinagar, Malleshwaram, Basaveshwaranagar and Vijayanagar are ten minutes
            away, and that is where most of our weddings are. East and south Bengaluru take longer
            to reach in traffic, so for a morning muhurtha in Whitefield or Sarjapur we start the
            night before.
          </p>

          <ul className="flex flex-wrap gap-2">
            {SERVICE_AREAS.local.map(area => (
              <li
                key={area}
                className="text-[13.5px] rounded-full px-3.5 py-1.5 bg-[var(--surface)]
                           border border-[var(--line)] text-[var(--ink-2)]"
              >
                {area}
              </li>
            ))}
          </ul>

          <p className="text-[14px] text-[var(--ink-3)] mt-5">
            Not on the list? It is not an exclusion — we serve the whole city. Ask.
          </p>
        </div>
      </section>

      {/* ---------- Wider South India ---------- */}
      <section className="bg-[var(--surface)] border-y border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-3 text-balance">
            Beyond the city
          </h2>
          <p className="text-[16px] leading-[1.65] text-[var(--ink-2)] max-w-[58ch] mb-8">
            We take work across Karnataka and the wider South — destination weddings, functions in
            a family&rsquo;s home town, temple events. These need a little more notice: the team
            travels, we usually cook on-site, and travel and accommodation are quoted separately
            and shown as their own line so nothing is buried. Two weeks&rsquo; notice is
            comfortable; less than a week is usually still possible.
          </p>

          <ul className="flex flex-wrap gap-2 mb-8">
            {SERVICE_AREAS.regional.map(area => (
              <li
                key={area}
                className="text-[13.5px] rounded-full px-3.5 py-1.5 bg-[var(--paper)]
                           border border-[var(--line)] text-[var(--ink-2)]"
              >
                {area}
              </li>
            ))}
          </ul>

          <p className="text-[15px] leading-[1.65] text-[var(--ink-2)] max-w-[58ch]">
            The cooking travels better than you would expect, because it is done at the venue
            rather than driven there. What changes outside Bengaluru is sourcing — some of the
            Karnataka staples need ingredients we bring with us rather than buy locally.
          </p>
        </div>
      </section>

      {/* ---------- Kitchen address ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <h2 className="font-display text-[24px] text-[var(--ink)] mb-3">The kitchen</h2>
              <address className="not-italic text-[15px] leading-[1.7] text-[var(--ink-2)]">
                {BUSINESS.address.line1}
                <br />
                {BUSINESS.address.line2}
                <br />
                {BUSINESS.address.city}, {BUSINESS.address.state} {BUSINESS.address.postcode}
              </address>
              <a
                href={BUSINESS.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[14px] text-[var(--accent)] hover:text-[var(--accent-hover)]
                           underline underline-offset-2 mt-3 transition-colors"
              >
                Open in Google Maps ↗
              </a>
              <p className="sr-only">{ADDRESS_LINE}</p>
            </div>

            <div>
              <h2 className="font-display text-[24px] text-[var(--ink)] mb-3">Talk to us</h2>
              <p className="text-[15px] leading-[1.7] text-[var(--ink-2)] mb-4">
                For anything outside Bengaluru, or happening this week, a call is faster than
                the form.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={TEL_HREF} className="btn btn-primary px-6 py-3">
                  {BUSINESS.phone}
                </a>
                <Link href="/order/new" className="btn btn-secondary px-6 py-3">
                  Get a quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
