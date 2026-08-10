'use client'

import type { Dish } from '@/types'
import type { OrderContextShape } from './CatalogueClient'
import { DietBadge } from './DietBadge'
import { DishImage } from './DishImage'

interface Props {
  dish: Dish
  onViewDetails: () => void
  orderContext?: OrderContextShape
  priority?: boolean
}

export function DishCard({ dish, onViewDetails, orderContext, priority }: Props) {
  const isSelected = orderContext?.selectedDishIds.includes(dish.id) ?? false
  const hasActiveMeal = !!orderContext?.activeMealId

  return (
    // The whole card is the details affordance; the add button stops propagation.
    // `group` drives the hover state so the image and title respond together.
    <article
      className="card group relative flex flex-col overflow-hidden cursor-pointer
                 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] hover:border-transparent
                 active:translate-y-0 active:scale-[.995] active:duration-75"
      onClick={onViewDetails}
    >
      <div className="relative aspect-[4/3] flex-shrink-0 overflow-hidden bg-[var(--dark-2)]">
        <DishImage
          id={dish.id}
          name={dish.name}
          course={dish.course}
          src={dish.image_url}
          blurDataUrl={dish.blur_data_url}
          priority={priority}
          className="transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.045]"
        />

        {isSelected && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 3px var(--accent)' }}
          />
        )}

        {/* DietBadge, not a second copy of the mark. The card used to inline
            its own square-and-dot, so the two drifted: the card drew the mark
            at 10px and the modal at 11px, and a change to the veg/non-veg
            colours had to be made in both places or only half the site moved. */}
        <div className="absolute top-3 left-3 z-10">
          <DietBadge dish={dish} variant="on-image" />
        </div>
      </div>

      <div className="p-4 pt-4 flex flex-col flex-1 gap-2.5">
        <div>
          <h3 className="font-display text-[19px] leading-[1.24] text-[var(--ink)] text-balance">
            {dish.name}
          </h3>
          <p className="text-[11px] font-semibold uppercase tracking-[.13em] text-[var(--ink-3)] mt-1.5">
            {dish.cuisine}
          </p>
        </div>

        <p className="text-[13.5px] leading-[1.56] text-[var(--ink-3)] line-clamp-2 flex-1">
          {dish.description}
        </p>

        {dish.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dish.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-[var(--accent-soft)] text-[color-mix(in_srgb,var(--accent)_82%,black)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {orderContext && (
          <div className="pt-1.5" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() =>
                isSelected ? orderContext.onRemoveDish(dish.id) : orderContext.onAddDish(dish.id)
              }
              disabled={!hasActiveMeal}
              className={`btn btn-sm w-full ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
              style={isSelected ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            >
              {isSelected ? (
                <>
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                    <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Added
                </>
              ) : hasActiveMeal ? (
                'Add to menu'
              ) : (
                'Select a meal first'
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
