'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import type { Dish } from '@/types'
import type { CatalogueClient } from './CatalogueClient'
import { DietBadge } from './DietBadge'

type OrderContext = React.ComponentProps<typeof CatalogueClient>['orderContext']

interface Props {
  dish: Dish
  onClose: () => void
  orderContext?: OrderContext
}

export function DishModal({ dish, onClose, orderContext }: Props) {
  const isSelected = orderContext?.selectedDishIds.includes(dish.id) ?? false
  const hasActiveMeal = !!orderContext?.activeMealId

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Image */}
        <div className="relative aspect-video bg-stone-100 flex-shrink-0">
          {dish.image_url ? (
            <Image src={dish.image_url} alt={dish.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">{dish.name}</h2>
            <DietBadge diet={dish.diet} />
          </div>

          <p className="text-stone-600 leading-relaxed">{dish.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {dish.course.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Course</p>
                <p className="text-[#1a1a1a] capitalize">{dish.course.join(', ')}</p>
              </div>
            )}
            {dish.cuisine && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Cuisine</p>
                <p className="text-[#1a1a1a]">{dish.cuisine}</p>
              </div>
            )}
            {dish.spice_level && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Spice Level</p>
                <p className="text-[#1a1a1a] capitalize">{dish.spice_level}</p>
              </div>
            )}
            {dish.cooking_method.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Cooking Method</p>
                <p className="text-[#1a1a1a] capitalize">{dish.cooking_method.join(', ')}</p>
              </div>
            )}
          </div>

          {dish.flavour_profile.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Flavour Profile</p>
              <div className="flex flex-wrap gap-1.5">
                {dish.flavour_profile.map(f => (
                  <span key={f} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1 capitalize">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dish.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Ingredients</p>
              <p className="text-sm text-stone-600 leading-relaxed">
                {dish.ingredients.join(', ')}
              </p>
            </div>
          )}

          {dish.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dish.tags.map(tag => (
                <span key={tag} className="text-xs text-stone-500 bg-stone-100 rounded-full px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer action */}
        {orderContext && (
          <div className="p-4 border-t border-stone-100 bg-white flex-shrink-0">
            {!hasActiveMeal ? (
              <p className="text-sm text-stone-400 text-center">Select a meal to add dishes</p>
            ) : (
              <button
                onClick={() =>
                  isSelected
                    ? orderContext.onRemoveDish(dish.id)
                    : orderContext.onAddDish(dish.id)
                }
                className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: isSelected ? '#1a1a1a' : 'var(--color-accent)' }}
              >
                {isSelected
                  ? `✓ Added to ${orderContext.activeMealName}`
                  : `Add to ${orderContext.activeMealName}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
