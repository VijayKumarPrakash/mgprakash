/**
 * Business identity and the brand palette in a form the non-CSS renderers can
 * read.
 *
 * The site itself reads colour from the custom properties in `app/globals.css`
 * and never hard-codes a hex. The PDF and the emails cannot: React-PDF has no
 * cascade, and email clients strip `:root` blocks and drop `var()`. Both were
 * therefore carrying their own literals — and both had gone stale, still
 * painting the retired `#C8860A` gold that was replaced precisely because it
 * only managed 3.2:1 against white and failed WCAG AA. A customer's quote PDF
 * was a different brand from the site that produced it.
 *
 * So the literals live here, once, mirroring `:root`. Changing a token in
 * globals.css means changing it here too — two places, which is the floor,
 * rather than the five it was spread across.
 */

export const BUSINESS = {
  name: 'M G Prakash Catering',
  /**
   * The name on the Google Business Profile, which is "M G Prakash - Cooking
   * Contractor" rather than "…Catering".
   *
   * Kept verbatim and deliberately. Search engines corroborate a site against
   * the profile it claims to be, and "cooking contractor" is also the phrase
   * customers here actually type — the trade has been called that in Bengaluru
   * far longer than "caterer" has. Both names are therefore surfaced in the
   * structured data via `alternateName`, so the two records reconcile.
   */
  gmbName: 'M G Prakash - Cooking Contractor',
  established: 2000,
  email: 'vijaykumar.sb.99@gmail.com',
  phone: '+91 98801 93165',
  /** Digits only — what `tel:` and `wa.me` links need. */
  phoneDigits: '919880193165',
  address: {
    line1: '611, 10th Cross Rd',
    line2: 'Indiranagar Rajajinagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postcode: '560079',
    countryCode: 'IN',
  },
  /**
   * Read off the resolved Google Maps place link below, not guessed. A
   * LocalBusiness `geo` that disagrees with the map pin is worse than no geo
   * at all — it is the kind of contradiction that costs local trust.
   */
  geo: { lat: 12.9967523, lng: 77.5446946 },
  mapsUrl: 'https://maps.app.goo.gl/uCvx2H7ypzXHDoPi9',
} as const

/** `611, 10th Cross Rd, Indiranagar Rajajinagar, Bengaluru, Karnataka 560079` */
export const ADDRESS_LINE = [
  BUSINESS.address.line1,
  BUSINESS.address.line2,
  BUSINESS.address.city,
  `${BUSINESS.address.state} ${BUSINESS.address.postcode}`,
].join(', ')

export const TEL_HREF = `tel:+${BUSINESS.phoneDigits}`
export const WHATSAPP_HREF = `https://wa.me/${BUSINESS.phoneDigits}`

/**
 * Years trading, computed rather than written down.
 *
 * The home page read "Twenty-five years" for long enough that it stopped being
 * true — the business was established in 2000. Any copy that states an age has
 * to derive it, or it quietly ages into a false claim on a page written
 * specifically to be indexed.
 */
export function yearsTrading(): number {
  return new Date().getFullYear() - BUSINESS.established
}

/**
 * Where the kitchen actually travels.
 *
 * Two tiers, because they are not the same claim and must not be flattened
 * into one list. The neighbourhoods are where a van leaves Rajajinagar in the
 * morning and is back the same night; the wider cities are real but need a
 * conversation about travel and an overnight team. Structured data reads both
 * as `areaServed`, but the copy has to keep the distinction or the site is
 * promising a Kochi wedding on Bengaluru terms.
 */
export const SERVICE_AREAS = {
  /** Same-day reach from the Rajajinagar kitchen. */
  local: [
    'Rajajinagar', 'Malleshwaram', 'Basaveshwaranagar', 'Vijayanagar',
    'Yeshwanthpur', 'Mahalakshmi Layout', 'Jayanagar', 'Basavanagudi',
    'Indiranagar', 'Koramangala', 'Whitefield', 'Hebbal',
    'Banashankari', 'RR Nagar', 'Kengeri', 'Yelahanka',
  ],
  /** Travelled to on request, across South India. */
  regional: [
    'Mysuru', 'Mangaluru', 'Hubballi–Dharwad', 'Davangere',
    'Tumakuru', 'Shivamogga', 'Belagavi', 'Kalaburagi',
    'Chennai', 'Coimbatore', 'Hyderabad', 'Kochi',
  ],
} as const

/** Mirrors the `:root` tokens in app/globals.css. See the note above. */
export const BRAND = {
  accent: '#A63D17',
  ink: '#1C1A17',
  ink2: '#524C43',
  muted: '#857C6F',
  paper: '#F6F2EB',
  surface: '#FFFDF9',
  line: '#E3DCCF',
  dark: '#1A1512',
} as const
