'use client'

import Image from 'next/image'
import type { Dish } from '@/types'
import type { CatalogueClient } from './CatalogueClient'
import { DietBadge } from './DietBadge'

type OrderContext = React.ComponentProps<typeof CatalogueClient>['orderContext']

interface Props {
  dish: Dish
  onViewDetails: () => void
  orderContext?: OrderContext
}

export function DishCard({ dish, onViewDetails, orderContext }: Props) {
  const isSelected = orderContext?.selectedDishIds.includes(dish.id) ?? false
  const hasActiveMeal = !!orderContext?.activeMealId

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-stone-100 flex-shrink-0">
        {dish.image_url ? (
          <Image
            src={dish.image_url}
            alt={dish.name}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[#1a1a1a] text-base leading-tight">{dish.name}</h3>
          <DietBadge diet={dish.diet} />
        </div>

        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed flex-1">
          {dish.description}
        </p>

        {dish.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dish.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onViewDetails}
            className="flex-1 px-3 py-2 rounded-full border border-stone-200 text-xs font-medium text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-colors"
          >
            View details
          </button>

          {orderContext && (
            <button
              onClick={() =>
                isSelected
                  ? orderContext.onRemoveDish(dish.id)
                  : orderContext.onAddDish(dish.id)
              }
              disabled={!hasActiveMeal}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                !hasActiveMeal
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : isSelected
                  ? 'text-white'
                  : 'text-white hover:opacity-90'
              }`}
              style={
                hasActiveMeal && !isSelected
                  ? { background: 'var(--color-accent)' }
                  : hasActiveMeal && isSelected
                  ? { background: '#1a1a1a' }
                  : {}
              }
            >
              {isSelected ? '✓ Added' : 'Add to menu'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
