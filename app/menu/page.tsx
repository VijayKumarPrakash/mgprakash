import type { Metadata } from 'next'
import { getAllDishes } from '@/lib/dishes'
import { CatalogueClient } from '@/components/catalogue/CatalogueClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Browse the full M G Prakash Catering catalogue — Karnataka, South Indian, North Indian, Mughlai and Indo-Chinese dishes. Filter by course, diet, spice and occasion.',
}

export default async function MenuPage() {
  const dishes = await getAllDishes()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow text-[var(--ink-3)] mb-4">The catalogue</p>
        <h1 className="font-display text-[clamp(32px,5vw,48px)] text-[var(--ink)] mb-3 text-balance">
          Everything we cook
        </h1>
        <p className="text-[16px] leading-[1.62] text-[var(--ink-2)]">
          {dishes.length} dishes across Karnataka, the wider South, the North, and a little
          Indo-Chinese. Search by name or ingredient, or filter down to exactly what your
          event needs — including pure veg, Jain, and dishes made without onion or garlic.
        </p>
      </header>

      <CatalogueClient dishes={dishes} />
    </div>
  )
}
