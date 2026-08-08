import type { Dish } from '@/types'

/**
 * The Indian veg/non-veg mark — a filled dot inside a square outline — read at
 * a glance by every customer this site has. Drawn rather than emoji'd so it
 * renders identically on every platform.
 */
function Mark({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative block w-[11px] h-[11px] rounded-[2px] flex-shrink-0"
      style={{ boxShadow: `inset 0 0 0 1.5px ${colour}` }}
    >
      <span
        className="absolute rounded-full"
        style={{ inset: '2.5px', background: colour }}
      />
    </span>
  )
}

interface Props {
  dish: Pick<Dish, 'diet' | 'is_vegan' | 'is_jain'>
  /** Adds Vegan/Jain pills alongside the base mark. Used in the detail panel. */
  detailed?: boolean
  onDark?: boolean
}

export function DietBadge({ dish, detailed = false, onDark = false }: Props) {
  const base =
    dish.diet === 'non-vegetarian'
      ? { label: 'Non-veg', colour: 'var(--nonveg)' }
      : dish.diet === 'egg'
      ? { label: 'Egg', colour: 'var(--egg)' }
      : { label: 'Veg', colour: 'var(--veg)' }

  const pill = onDark
    ? 'bg-[rgba(247,241,230,.10)] text-[var(--dark-ink-2)]'
    : 'bg-[var(--surface-2)] text-[var(--ink-2)]'

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 ${pill}`}
      >
        <Mark colour={base.colour} />
        {base.label}
      </span>

      {detailed && dish.is_vegan && (
        <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${pill}`}>Vegan</span>
      )}
      {detailed && dish.is_jain && (
        <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${pill}`}>Jain</span>
      )}
    </span>
  )
}
