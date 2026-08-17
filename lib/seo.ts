/**
 * Everything search engines read, in one place.
 *
 * Two problems this module exists to stop recurring.
 *
 * The first is the absolute URL. `app/layout.tsx` had `metadataBase` pinned to
 * `https://mgprakashcatering.com`, a domain with no DNS record at all — so
 * every canonical, every OpenGraph URL and every sitemap entry Next generated
 * pointed at a host that does not resolve. A canonical tag naming a dead origin
 * is not a neutral mistake: it tells Google the page it is looking at is a copy
 * of somewhere else, and the somewhere else cannot be fetched. `SITE_URL` below
 * is the single origin the whole site derives from, and it comes from the
 * environment, so buying the real domain later is one Vercel variable rather
 * than a hunt through the tree.
 *
 * The second is structured data drift. The business name, address and phone
 * appear in the footer, the emails, the PDF and now in JSON-LD. Local search
 * corroborates a site against its Google Business Profile by matching those
 * three fields character for character, so they cannot be retyped per surface.
 * Every builder here reads `lib/business.ts`.
 */

import { BUSINESS } from './business'

/* ------------------------------------------------------------------ *
 * Origin
 * ------------------------------------------------------------------ */

const FALLBACK_ORIGIN = 'https://mgprakash.vercel.app'

/**
 * The canonical origin, with no trailing slash.
 *
 * `NEXT_PUBLIC_SITE_URL` is already the variable the emails and the PDF use to
 * build their `/order/[id]` links, so this reuses it rather than introducing a
 * second, separately-wrong source of truth. The fallback is the live Vercel
 * deployment rather than localhost: an unset variable in production should
 * still produce a working canonical, not one pointing at a developer's laptop.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN).replace(/\/+$/, '')

/** `/menu` → `https://…/menu`. Pass paths with a leading slash. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/* ------------------------------------------------------------------ *
 * Shared copy
 *
 * The description a search result actually shows. Written to carry the phrases
 * people type — "cooking contractor", "catering", "Bengaluru" — while still
 * reading as a sentence a human wrote, because Google has penalised the other
 * kind since roughly 2012.
 * ------------------------------------------------------------------ */

export const SITE_NAME = 'M G Prakash Catering'

export const SITE_TAGLINE = 'Cooking Contractor & Caterer in Bengaluru'

export const SITE_DESCRIPTION =
  'M G Prakash Catering — cooking contractor and caterer in Rajajinagar, Bengaluru since 2000. ' +
  'South Indian, Karnataka and North Indian food for weddings, namakarana, gruha pravesha and ' +
  'corporate events. Pure veg, Jain and no onion-garlic menus. Travels across South India.'

/* ------------------------------------------------------------------ *
 * JSON-LD
 * ------------------------------------------------------------------ */

/**
 * `<script type="application/ld+json">` needs `dangerouslySetInnerHTML` — React
 * escapes `<` and `&` into entities inside a normal text child, and a JSON-LD
 * block containing `&` is not valid JSON to a parser, so the whole graph
 * is silently dropped.
 *
 * Escaping `<` on the way out is what makes that safe. Without it a string
 * containing `</script>` closes the block early and everything after it is
 * parsed as markup. Nothing user-submitted reaches this today — dish copy is
 * ours — but the FAQ and services strings sit next to fields that are one
 * refactor away from being editable, and `<` costs nothing.
 */
export function jsonLdScript(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}

/** Stable `@id`s, so the nodes in the graph reference each other rather than repeating. */
export const ID = {
  business: `${SITE_URL}/#business`,
  website: `${SITE_URL}/#website`,
  organisation: `${SITE_URL}/#organisation`,
} as const

/**
 * The `Caterer` node — the single most valuable object on the site.
 *
 * `Caterer` is a subtype of `FoodEstablishment` and `LocalBusiness`, which is
 * more specific than the bare `LocalBusiness` most sites emit and therefore a
 * stronger signal for exactly the query this business wants.
 *
 * `sameAs` pointing at the Google Maps place link is the part that matters
 * most. A Business Profile for "M G Prakash - Cooking Contractor" already
 * exists at that pin; until now nothing on the site referenced it, so the two
 * records were unconnected as far as any crawler could tell. This is the edge
 * that joins them.
 *
 * Deliberately absent: `openingHours`, `aggregateRating` and `priceRange`.
 * Hours are not published anywhere reliable, and inventing them puts a wrong
 * "Closed now" under the map listing. A self-declared `aggregateRating` with no
 * reviews behind it is a manual-action risk and is ignored by Google in any
 * case. Add all three once there is a real source.
 */
export function catererSchema() {
  return {
    '@type': ['Caterer', 'LocalBusiness'],
    '@id': ID.business,
    name: BUSINESS.name,
    alternateName: [BUSINESS.gmbName, 'M G Prakash Cooking Contractor', 'MG Prakash Catering'],
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    foundingDate: String(BUSINESS.established),
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${BUSINESS.address.line1}, ${BUSINESS.address.line2}`,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.state,
      postalCode: BUSINESS.address.postcode,
      addressCountry: BUSINESS.address.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.lat,
      longitude: BUSINESS.geo.lng,
    },
    hasMap: BUSINESS.mapsUrl,
    sameAs: [BUSINESS.mapsUrl],
    /**
     * Bengaluru as a City, then the states the team will travel to. The two
     * tiers in SERVICE_AREAS collapse here because schema.org has no vocabulary
     * for "same day versus needs a conversation" — the page copy carries that.
     */
    areaServed: [
      { '@type': 'City', name: 'Bengaluru' },
      { '@type': 'State', name: 'Karnataka' },
      { '@type': 'State', name: 'Tamil Nadu' },
      { '@type': 'State', name: 'Telangana' },
      { '@type': 'State', name: 'Kerala' },
      { '@type': 'State', name: 'Andhra Pradesh' },
    ],
    serviceType: [
      'Wedding catering',
      'Namakarana catering',
      'Gruha pravesha catering',
      'Corporate event catering',
      'Satvik and no onion-garlic catering',
      'Jain catering',
      'Pure vegetarian catering',
    ],
    knowsLanguage: ['kn', 'en', 'hi', 'ta', 'te'],
    servesCuisine: ['South Indian', 'Karnataka', 'Udupi', 'North Indian', 'Mughlai', 'Indo-Chinese'],
    hasMenu: absoluteUrl('/menu'),
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/order/new'),
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: 'Catering quote request' },
    },
  }
}

/**
 * `WebSite` with a `SearchAction`, which is what makes a sitelinks search box
 * eligible. The catalogue already reads `?q=` — see `CatalogueClient` — so the
 * template below points at a real, working URL rather than an aspirational one.
 */
export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-IN',
    publisher: { '@id': ID.business },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/menu?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Breadcrumbs. Worth emitting on every page below the root: Google replaces the
 * raw URL in the result with the trail, which measurably lifts click-through on
 * deep pages — and 229 dish pages are all deep pages.
 */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function faqSchema(entries: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** Wraps nodes into one `@graph`, so a page emits a single connected document. */
export function graph(...nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }
}
