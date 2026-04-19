import { getAllDishes } from '@/lib/dishes'
import { CatalogueClient } from '@/components/catalogue/CatalogueClient'

export const revalidate = 3600

export default async function MenuPage() {
  const dishes = await getAllDishes()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-2">
          Our Menu
        </h1>
        <p className="text-stone-500 text-base">
          {dishes.length} dishes · Browse, search, and filter to find the perfect selection for your event.
        </p>
      </div>

      <CatalogueClient dishes={dishes} />
    </div>
  )
}
