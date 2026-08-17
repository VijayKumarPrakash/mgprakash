import type { Metadata, Viewport } from 'next'
import './globals.css'
import { display, body } from './fonts'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import {
  SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION,
  catererSchema, websiteSchema, graph, jsonLdScript,
} from '@/lib/seo'

export const metadata: Metadata = {
  /**
   * Was pinned to `https://mgprakashcatering.com`, which has no DNS record —
   * every canonical and OpenGraph URL on the site resolved to nothing. It now
   * derives from NEXT_PUBLIC_SITE_URL; see the note in lib/seo.ts.
   */
  metadataBase: new URL(SITE_URL),

  /**
   * The default title carries the two phrases this business is actually
   * searched by — its name, and the trade as it is named locally. "Bengaluru"
   * alone was leaving the single highest-intent query on the table.
   */
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,

  /**
   * No `alternates.canonical` here on purpose. Next resolves that field
   * relative to the current route rather than treating it as a default, so a
   * root-level `'/'` is inherited verbatim by every page that does not override
   * it — which had /auth/login declaring itself a duplicate of the home page.
   * Each indexable route sets its own; anything that forgets gets none, which
   * is the safe failure.
   */

  keywords: [
    'M G Prakash', 'MG Prakash', 'M G Prakash Catering', 'M G Prakash cooking contractor',
    'cooking contractor Bangalore', 'cooking contractor Bengaluru',
    'catering Rajajinagar', 'South Indian catering Bangalore',
    'wedding catering Bengaluru', 'namakarana catering', 'gruha pravesha catering',
    'pure veg catering Bangalore', 'Jain catering Bengaluru',
  ],

  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  /**
   * No `url` here, for the same reason as `alternates` above: a root-level
   * value is inherited verbatim rather than resolved per route, so every page
   * on the site would advertise `og:url` as the home page. Pages that care set
   * their own.
   */
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: 'en_IN',
  },

  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Lets Google show a full-length snippet and a large image thumbnail
      // rather than defaulting to a clipped one.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  // Bengaluru, so a regional crawler places the business without inference.
  other: {
    'geo.region': 'IN-KA',
    'geo.placename': 'Bengaluru',
  },

  formatDetection: { telephone: true, address: true },
}

export const viewport: Viewport = {
  themeColor: '#1A1512',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  /**
   * The Caterer and WebSite nodes ship on every page, in one `@graph`.
   *
   * Site-wide rather than home-page-only on purpose: a dish page is a perfectly
   * likely first landing page from search, and the business identity has to be
   * attached wherever a crawler happens to arrive. Per-page nodes (breadcrumbs,
   * the menu item, the FAQ) reference these by `@id` instead of restating them.
   */
  const siteGraph = graph(catererSchema(), websiteSchema())

  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(siteGraph)}
        />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
