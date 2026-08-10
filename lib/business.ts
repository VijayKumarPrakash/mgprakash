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
  },
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
