import type { Metadata } from 'next'
import Link from 'next/link'
import { BUSINESS, TEL_HREF } from '@/lib/business'
import { getDishCount } from '@/lib/dishes'
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
 *
 * NO GUEST RANGES ANYWHERE ON THIS PAGE. Each service used to carry one — the
 * namakarana entry said "30–300 guests" and the wedding entry "50–5,000+" — and
 * both ends were wrong. There is no floor: the kitchen has cooked for five
 * people. And a per-service ceiling implies some occasions are capped lower
 * than others, which is not how it works; any type of function can be catered
 * at any size we can reasonably reach. State the overall scale in prose, once,
 * and let the customer tell us their headcount.
 */

export const metadata: Metadata = {
  title: 'Catering Services — Cooking Contractor in Bengaluru',
  description:
    'Wedding catering, namakarana, gruha pravesha, corporate, festival and funeral catering in ' +
    `Bengaluru. M G Prakash has worked as a cooking contractor from Rajajinagar since ${BUSINESS.established} — ` +
    'cooked at your venue or brought to it, pure veg, Jain and satvik menus, no guest minimum and ' +
    'annadana meals for well over five thousand.',
  alternates: { canonical: '/services' },
  openGraph: {
    url: absoluteUrl('/services'),
    title: 'Catering Services — Cooking Contractor in Bengaluru',
  },
}

/** A function of the dish count, so the catalogue size is never typed in. */
const services = (dishCount: number) => [
  {
    slug: 'wedding',
    title: 'Wedding & reception catering',
    lede: 'The full sequence — muhurtha breakfast, the wedding meal, and the reception dinner.',
    body:
      'A Bengaluru wedding is rarely one meal. We plan the whole run of them together, so the ' +
      'muhurtha tiffin, the afternoon oota on a banana leaf and the reception buffet do not repeat ' +
      'the same three dishes. Traditional Karnataka wedding oota — obbattu, kosambari, palya, ' +
      'huli, chitranna, mosaru bhath — through to a mixed North Indian and Indo-Chinese reception ' +
      'spread.',
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
  },
  {
    slug: 'gruha-pravesha',
    title: 'Gruha pravesha & housewarming',
    lede: 'House blessings, where the kitchen is often the one being blessed.',
    body:
      'Frequently cooked on-site at the new house, which is the older way of doing it and still the ' +
      'one many families want — the first meal in a home cooked in that home. We bring the vessels, ' +
      'the burners and the team. Where the kitchen is not ready, we cook elsewhere and bring the ' +
      'food hot.',
  },
  {
    slug: 'corporate',
    title: 'Corporate & office catering',
    lede: 'Launches, festival lunches, offsites and team celebrations.',
    body:
      'Predictable timing and a menu that suits a room where half the guests are vegetarian and ' +
      'half are not, without the two queues becoming an incident. We label every dish clearly, ' +
      'keep veg and non-veg service physically separated, and can hold to a fixed serving window ' +
      'when a session starts at two. Single occasions rather than a standing daily contract — see ' +
      'One event at a time below.',
  },
  {
    slug: 'festive',
    title: 'Festival, annadana & temple prasad',
    lede: 'Ugadi, Ganesha Chaturthi, Deepavali, annadana and satvik meals.',
    body:
      `Onion and garlic are tracked as a separate field on every one of our ${dishCount} dishes, ` +
      'apart from the Jain flag, because a temple-adjacent meal excludes alliums without necessarily ' +
      'applying Jain rules on root vegetables. That distinction is built into the catalogue, so a ' +
      'satvik menu is filtered rather than remembered. Annadana at a festival is where the numbers ' +
      'get largest — meals for well over five thousand people have gone out of this kitchen.',
  },
  {
    slug: 'funeral',
    title: 'Funeral & condolence meals',
    lede: 'Simple, dignified, and arranged at very short notice.',
    body:
      'Usually plain satvik food for the days following, and usually needed tomorrow. Call rather ' +
      'than use the quote form for these — we will work out the numbers on the phone. The notice we ' +
      'ask for elsewhere does not apply here.',
  },
] as const

/**
 * The three decisions that actually shape a quote.
 *
 * Customers arrive assuming catering is one indivisible service and are
 * surprised to learn how much of it they can keep or hand over. Laying the
 * choices out as three independent axes is the honest shape of the business —
 * you can be cooked for at your venue while buying your own groceries, or have
 * everything from the market run to the last vessel handled for you.
 */
const ENGAGEMENT = [
  {
    title: 'Where the cooking happens',
    options: [
      {
        name: 'At your venue',
        detail:
          'The older way, and still the one most families want. The team, the vessels and the ' +
          'burners come to you, and the meal is cooked where it is eaten.',
      },
      {
        name: 'At a godown or our kitchen',
        detail:
          'Where a venue has no space, no water or no gas point — an apartment clubhouse, a ' +
          'seminar hall, a site still under construction. We cook off-site and bring the food ' +
          'to the venue hot.',
      },
    ],
  },
  {
    title: 'How far we carry it',
    options: [
      {
        name: 'Cooking only',
        detail:
          'We cook and hand over. Suitable where the family or the hall has its own serving ' +
          'staff, or where the meal is being packed and distributed rather than served.',
      },
      {
        name: 'Cooking and serving',
        detail:
          'Our team serves as well — banana leaf service, buffet counters, or plated, whichever ' +
          'the function calls for. Clearing afterwards included.',
      },
    ],
  },
  {
    title: 'Who buys the groceries',
    options: [
      {
        name: 'You buy, we curate the list',
        detail:
          'Many families prefer to buy the provisions themselves, and several traditions expect ' +
          'it. You get an itemised list — quantities, grades, what to buy where — and we cook ' +
          'with what you have bought.',
      },
      {
        name: 'End to end',
        detail:
          'We handle all of it: groceries and provisions, vessels on rent, the natural gas ' +
          'connection, transport, the team, the serving. One point of contact and nothing on ' +
          'your list.',
      },
    ],
  },
] as const

export default async function ServicesPage() {
  const dishCount = await getDishCount()
  const SERVICES = services(dishCount)

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
     *
     * `audience` used to carry the guest range as an audienceType. It went with
     * the ranges themselves — a machine-readable minimum is still a minimum.
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
          <p className="text-[18px] leading-[1.62] text-[var(--dark-ink-2)] max-w-[54ch]">
            M G Prakash has worked as a cooking contractor in Bengaluru since {BUSINESS.established} —
            weddings, naming ceremonies, house blessings, corporate lunches, festival annadana and the
            quiet meals that follow a funeral. Cooked at your venue where there is room for it, or in a
            godown and brought to you where there is not.
          </p>
          <p className="text-[16px] leading-[1.62] text-[var(--dark-ink-3)] max-w-[54ch] mt-5">
            There is no function too small. We have cooked for five people and we have cooked for
            more than five thousand.
          </p>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="space-y-12">
            {SERVICES.map(s => (
              <article key={s.slug} className="border-l-2 pl-6 sm:pl-8" style={{ borderColor: 'var(--accent)' }}>
                <h2 className="font-display text-[clamp(22px,3vw,29px)] text-[var(--ink)] text-balance mb-2">
                  {s.title}
                </h2>
                <p className="text-[16px] leading-[1.6] text-[var(--ink-2)] font-medium mb-3">
                  {s.lede}
                </p>
                <p className="text-[15px] leading-[1.7] text-[var(--ink-2)]">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Engagement ---------- */}
      <section className="bg-[var(--surface)] border-y border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-4 text-balance">
            How much of it you hand over
          </h2>
          <p className="text-[16px] leading-[1.7] text-[var(--ink-2)] max-w-[62ch] mb-12">
            Catering is not one indivisible service, and you do not have to take all of it or none.
            There are three separate decisions here and they are yours to make in any combination —
            we will tell you honestly which one suits your venue and your family.
          </p>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {ENGAGEMENT.map(axis => (
              <div key={axis.title}>
                <h3 className="font-display text-[20px] text-[var(--ink)] mb-5 pb-3 border-b border-[var(--line)]">
                  {axis.title}
                </h3>
                <ul className="space-y-6">
                  {axis.options.map(option => (
                    <li key={option.name}>
                      <p className="text-[14px] font-semibold text-[var(--accent)] mb-1.5">
                        {option.name}
                      </p>
                      <p className="text-[14.5px] leading-[1.65] text-[var(--ink-2)]">
                        {option.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* The constant across every combination — the part customers are
              most surprised to hear is included at every level. */}
          <div
            className="mt-12 rounded-[var(--r-lg)] p-6 sm:p-8"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
          >
            <h3 className="font-display text-[20px] text-[var(--ink)] mb-3">
              What you get whichever you choose
            </h3>
            <p className="text-[15px] leading-[1.7] text-[var(--ink-2)] max-w-[68ch]">
              We work with you from the first conversation to the last vessel going back, at every
              level of engagement. That means building the menu together, then an{' '}
              <strong className="font-semibold text-[var(--ink)]">itemised provisions list</strong> —
              every ingredient with quantities worked out for your headcount — and a{' '}
              <strong className="font-semibold text-[var(--ink)]">vessels list</strong> for what the
              cooking and serving will need. You get both even if you have asked us only to cook, and
              you get both before you have committed to anything, because they are what let you check
              the quote makes sense.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Sourcing ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-8 text-balance">
            Where the food comes from
          </h2>
          <div className="space-y-5 max-w-[64ch]">
            <p className="text-[15.5px] leading-[1.75] text-[var(--ink-2)]">
              Twenty-five years in the same trade in the same city buys you relationships, and that is
              most of what sourcing is. We buy from the local markets rather than a wholesaler&rsquo;s
              catalogue, which is why the vegetables arrive the morning of the function rather than
              two days before it.
            </p>
            <p className="text-[15.5px] leading-[1.75] text-[var(--ink-2)]">
              For a non-vegetarian menu we work with meat vendors we have used for years and can tell
              you where the chicken or mutton is coming from. Beyond the cooking, the same network
              covers the things that turn up at the edges of a function — ice cream for a reception,
              fresh juice for a welcome counter, curd and sweets in quantity. If it belongs on the
              table we can usually arrange it; ask when you send the enquiry.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Cost & notice ---------- */}
      <section className="bg-[var(--surface)] border-y border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <h2 className="font-display text-[clamp(24px,3.4vw,32px)] text-[var(--ink)] mb-5 text-balance">
                What it costs
              </h2>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  We quote per plate rather than publish a rate card, because the number genuinely
                  depends on the menu you pick, the headcount, the venue and how much of the work you
                  are handing over. A satvik lunch for eighty at home and a reception dinner for eight
                  hundred are not the same trade.
                </p>
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  A non-vegetarian menu costs more per plate than a vegetarian one — the ingredients
                  cost more and the cooking and service have to be kept separate. Where a function is
                  mixed, that is why we ask for the two headcounts separately.
                </p>
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  Build the menu on this site and the quote is written, free, and comes with a PDF of
                  exactly what you chose. There is no obligation attached to it.
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-[clamp(24px,3.4vw,32px)] text-[var(--ink)] mb-5 text-balance">
                How much notice
              </h2>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  A few weeks at minimum, and months rather than weeks for a wedding or anything in
                  festival season. This is not us being difficult about scheduling — the dates go
                  early, and once a day is taken it is taken.
                </p>
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  <strong className="font-semibold text-[var(--ink)]">
                    We accept one work order a day.
                  </strong>{' '}
                  One function, one kitchen, one team, the whole day. It is the reason the food is
                  what it is, and the reason we cannot fit you in next to somebody else&rsquo;s
                  wedding.
                </p>
                <p className="text-[15px] leading-[1.72] text-[var(--ink-2)]">
                  Condolence meals are the exception and always will be. Call and we will find a way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- One event at a time ---------- */}
      <section className="bg-[var(--paper)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2
            id="one-event-at-a-time"
            className="font-display text-[clamp(24px,3.4vw,32px)] text-[var(--ink)] mb-5 text-balance"
          >
            One event at a time
          </h2>
          <p className="text-[15.5px] leading-[1.75] text-[var(--ink-2)] max-w-[64ch]">
            We cater one-off events — a wedding, a naming ceremony, a housewarming, a festival
            annadana, a company lunch. We do not take on running catering: no daily meals for a paying
            guest house or hostel, no office canteen, no weekly tiffin contract. Those need a kitchen
            organised around repetition, and this one is organised around getting a single occasion
            exactly right. If that is what you are looking for we will say so straight away rather
            than waste your week.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-[var(--surface)] border-y border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(26px,4vw,36px)] text-[var(--ink)] mb-8 text-balance">
            How booking works
          </h2>
          <ol className="grid sm:grid-cols-4 gap-8">
            {[
              {
                n: '01',
                t: 'Build a menu',
                d: `Browse all ${dishCount} dishes and pick what you want, meal by meal. No account needed.`,
              },
              {
                n: '02',
                t: 'We quote',
                d: 'A written quote with a PDF of the menu exactly as you chose it, and a note of what we would change.',
              },
              {
                n: '03',
                t: 'Lists and logistics',
                d: 'An itemised provisions list and a vessels list, then we settle who is handling which part.',
              },
              {
                n: '04',
                t: 'We cook',
                d: 'Fresh on the day — at your venue where there is room, otherwise cooked off-site and brought hot.',
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
