import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS, TEL_HREF } from '@/lib/business'
import { absoluteUrl, breadcrumbSchema, graph, jsonLdScript, ID } from '@/lib/seo'

/**
 * The page that competes for "cooking contractor in Bangalore" and its
 * variants.
 *
 * The home page sells the business; this one answers the query. Those are
 * different jobs — a search result has to match the words someone typed, and
 * the home page deliberately leads with a mood line ("Catering crafted for
 * every occasion") that matches nothing anyone searches for. The copy below
 * uses the vocabulary customers here actually use, including "cooking
 * contractor", which is what the trade is called in Bengaluru and what the
 * Google Business Profile is already named.
 *
 * Written as real answers rather than keyword padding. Thin doorway pages that
 * repeat a phrase and say nothing have been a demotion signal since the
 * helpful-content update; the defence is that every paragraph here tells a
 * customer something they needed to know.
 */

export const metadata: Metadata = {
  title: 'Catering Services — Cooking Contractor in Bengaluru',
  description:
    'Wedding catering, namakarana, gruha pravesha, corporate and funeral catering in Bengaluru. ' +
    'M G Prakash has worked as a cooking contractor from Rajajinagar since 2000 — on-site cooking, ' +
    'pure veg, Jain and satvik menus, from 50 to over 5,000 guests.',
  alternates: { canonical: '/services' },
  openGraph: {
    url: absoluteUrl('/services'),
    title: 'Catering Services — Cooking Contractor in Bengaluru',
  },
}

const SERVICES = [
  {
    slug: 'wedding',
    title: 'Wedding & reception catering',
    lede: 'The full sequence — muhurtha breakfast, the wedding meal, and the reception dinner.',
    body:
      'A Bengaluru wedding is rarely one meal. We plan the whole run of them together, so the ' +
      'muhurtha tiffin, the afternoon oota on a banana leaf and the reception buffet do not repeat ' +
      'the same three dishes. Traditional Karnataka wedding oota — obbattu, kosambari, palya, ' +
      'huli, chitranna, mosaru bhath — through to a mixed North Indian and Indo-Chinese reception ' +
      'spread. We have cooked for gatherings from fifty people at home up to functions where more ' +
      'than five thousand have eaten.',
    scale: '50–5,000+ guests',
  },
  {
    slug: 'namakarana',
    title: 'Namakarana & seemantha',
    lede: 'Naming ceremonies and baby showers, usually at home or in a small hall.',
    body:
      'These run early and they run to a strict muhurtha, so the food has to be ready before the ' +
      'priest is. Menus are typically satvik — no onion, no garlic — and we filter the catalogue ' +
      'that way as standard rather than treating it as a special request. Expect payasam, ' +
      'kosambari, a couple of palyas, huli and rice, with tiffin for the guests arriving early.',
    scale: '30–300 guests',
  },
  {
    slug: 'gruha-pravesha',
    title: 'Gruha pravesha & housewarming',
    lede: 'House blessings, where the kitchen is often the one being blessed.',
    body:
      'Frequently cooked on-site at the new house, which is the older way of doing it and still the ' +
      'one many families want — the first meal in a home cooked in that home. We bring the vessels, ' +
      'the burners and the team. Where the kitchen is not ready, we cook at Rajajinagar and serve hot.',
    scale: '30–400 guests',
  },
  {
    slug: 'corporate',
    title: 'Corporate & office catering',
    lede: 'Launches, festival lunches, offsites and long-running office meal contracts.',
    body:
      'Predictable timing and a menu that suits a room where half the guests are vegetarian and ' +
      'half are not, without the two queues becoming an incident. We label every dish clearly, ' +
      'keep veg and non-veg service physically separated, and can hold to a fixed serving window ' +
      'when a session starts at two.',
    scale: '25–1,000 guests',
  },
  {
    slug: 'festive',
    title: 'Festival & religious catering',
    lede: 'Ugadi, Ganesha Chaturthi, Deepavali, temple prasad and satvik meals.',
    body:
      'Onion and garlic are tracked as a separate field on every one of the 229 dishes, apart from ' +
      'the Jain flag, because a temple-adjacent meal excludes alliums without necessarily applying ' +
      'Jain rules on root vegetables. That distinction is built into the catalogue, so a satvik ' +
      'menu is filtered rather than remembered.',
    scale: '50–1,500 guests',
  },
  {
    slug: 'funeral',
    title: 'Funeral & condolence meals',
    lede: 'Simple, dignified, and arranged at very short notice.',
    body:
      'Usually plain satvik food for the days following, and usually needed tomorrow. Call rather ' +
      'than use the quote form for these — we will work out the numbers on the phone.',
    scale: '30–500 guests',
  },
] as const

export default function ServicesPage() {
  const pageGraph = graph(
    {
      '@type': 'WebPage',
      '@id': `${absoluteUrl('/services')}#webpage`,
      url: absoluteUrl('/services'),
      name: 'Catering services in Bengaluru',
      isPartOf: { '@id': ID.website },
      about: { '@id': ID.business },
    },
    /**
     * One Service node per offering. This is what lets a search engine answer
     * "who does namakarana catering in Bengaluru" with this business rather
     * than needing to infer it from prose.
     */
    ...SERVICES.map(s => ({
      '@type': 'Service',
      '@id': `${absoluteUrl('/services')}#${s.slug}`,
      name: s.title,
      description: s.lede,
      serviceType: s.title,
      provider: { '@id': ID.business },
      areaServed: [
        { '@type': 'City', name: 'Bengaluru' },
        { '@type': 'State', name: 'Karnataka' },
      ],
      audience: { '@type': 'Audience', audienceType: s.scale },
    })),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ])
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(pageGraph)} />

      {/* ---------- Header ---------- */}
      <section className="on-dark bg-[var(--dark)] text-[var(--dark-ink)] -mt-[68px] pt-[68px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <p className="eyebrow text-[var(--dark-ink-3)] mb-6">
            Cooking contractor · Rajajinagar, Bengaluru
          </p>
          <h1 className="font-display text-[clamp(32px,6vw,56px)] leading-[1.1] text-balance mb-6">
            What we cater
          </h1>
          <p className="text-[18px] leading-[1.62] text-[var(--dark-ink-2)] max-w-[52ch]">
            M G Prakash has worked as a cooking contractor in Bengaluru since {BUSINESS.established} —
            weddings, naming ceremonies, house blessings, corporate lunches and the quiet meals that
            follow a funeral. On-site cooking where the venue allows it, and a kitchen in Rajajinagar
            where it does not.
          </p>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="space-y-12">
            {SERVICES.map(s => (
              <article key={s.slug} className="border-l-2 pl-6 sm:pl-8" style={{ borderColor: 'var(--accent)' }}>
                <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                  <h2 className="font-display text-[clamp(22px,3vw,29px)] text-[var(--ink)] text-balance">
                    {s.title}
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[.13em] text-[var(--ink-3)] whitespace-nowrap">
                    {s.scale}
                  </span>
                </div>
                <p className="text-[16px] leading-[1.6] text-[var(--ink-2)] font-medium mb-3">
                  {s.lede}
                </p>
                <p className="text-[15px] leading-[1.7] text-[var(--ink-2)]">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-[var(--surface)] border-y border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-8 text-balance">
            How booking works
          </h2>
          <ol className="grid sm:grid-cols-3 gap-8">
            {[
              {
                n: '01',
                t: 'Build a menu',
                d: 'Browse all 229 dishes and pick what you want, meal by meal. No account needed.',
              },
              {
                n: '02',
                t: 'We quote',
                d: 'A written quote the same day, with a PDF of the menu exactly as you chose it.',
              },
              {
                n: '03',
                t: 'We cook',
                d: 'Prepared fresh on the day — on-site where the venue has the space, otherwise from Rajajinagar.',
              },
            ].map(step => (
              <li key={step.n}>
                <p className="font-display text-[30px] text-[var(--accent)] leading-none mb-3">{step.n}</p>
                <h3 className="font-display text-[19px] text-[var(--ink)] mb-2">{step.t}</h3>
                <p className="text-[14.5px] leading-[1.6] text-[var(--ink-2)]">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="on-dark bg-[var(--dark)] text-[var(--dark-ink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-[clamp(24px,4vw,34px)] mb-2 text-balance">
              Tell us about your event
            </h2>
            <p className="text-[15.5px] text-[var(--dark-ink-2)]">
              Or call {BUSINESS.phone} — quickest for anything happening this week.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link href="/order/new" className="btn btn-primary px-7 py-3.5">
              Get a quote
            </Link>
            <a href={TEL_HREF} className="btn btn-secondary px-7 py-3.5">
              Call now
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
