import type { MetadataRoute } from 'next'
import { getAllDishes } from '@/lib/dishes'
import { absoluteUrl } from '@/lib/seo'

/**
 * The sitemap is what turns 229 rows in Supabase into 229 candidates for the
 * index. Without one, a dish page is only discoverable by crawling the A–Z list
 * at the foot of /menu — which works, but slowly, and gives Google no
 * `lastModified` to prioritise against.
 *
 * `getAllDishes` already falls back to `food_db.json5` when Supabase is
 * unreachable, and this route inherits that: a database blip degrades the
 * sitemap to the file copy rather than serving an XML document listing four
 * URLs, which is what an unguarded read would do the one time it mattered.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: absoluteUrl('/menu'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/services'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/areas'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/order/new'), lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
  ]

  let dishes: Awaited<ReturnType<typeof getAllDishes>> = []
  try {
    dishes = await getAllDishes()
  } catch {
    // Catalogue unreachable — serve the static routes rather than a 500. A
    // partial sitemap is recrawled; a failing one gets flagged in Search Console.
    return staticRoutes
  }

  return [
    ...staticRoutes,
    ...dishes.map(dish => ({
      url: absoluteUrl(`/menu/${dish.id}`),
      lastModified: now,
      changeFrequency: 'yearly' as const,
      // Below the hub pages deliberately. Priority is only a relative hint
      // within one sitemap, and flattening everything to 1.0 — the usual
      // mistake — tells Google nothing at all.
      priority: 0.6,
    })),
  ]
}
