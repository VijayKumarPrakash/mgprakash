import type { MetadataRoute } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/seo'

/**
 * There was no robots.txt at all — /robots.txt returned a 404 on the live site,
 * and so did /sitemap.xml. Nothing was telling a crawler what to fetch or what
 * to leave alone.
 *
 * The disallow list is the more important half. `/order/[id]` is a capability
 * URL: the uuid is the only secret protecting an order that anyone holding the
 * emailed link can read, and public SELECT on `orders` is deliberate (see the
 * row-level-security note in CLAUDE.md). A crawled and indexed confirmation
 * page would put a customer's name, phone number and venue into a search
 * result. `Allow: /order/new` sits above it because the quote form is the most
 * valuable page on the site and must stay indexable — Google resolves
 * conflicting rules by the most specific match, not by order, so the narrower
 * Allow wins over the broader Disallow.
 *
 * Note this is a crawl directive, not an access control. It stops well-behaved
 * crawlers; it is not what keeps order pages private. The `noindex` on the page
 * itself is the belt to this brace.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/order/new'],
        disallow: [
          '/api/',
          '/order/',      // capability URLs — see above
          '/account/',
          '/auth/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
