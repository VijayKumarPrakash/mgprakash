import type { Dish } from '@/types'

/**
 * The Indian veg/non-veg mark — a filled dot inside a square outline — read at
 * a glance by every customer this site has. Drawn rather than emoji'd so it
 * renders identically on every platform.
 *
 * This is the only place the mark is drawn. DishCard used to inline its own
 * copy over the photograph, which is how the card ended up with a 10px mark
 * while the modal had an 11px one, and how a change to the diet colours would
 * have moved only half the site.
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

const DIET = {
  'non-vegetarian': { label: 'Non-veg', colour: 'var(--nonveg)' },
  egg: { label: 'Egg', colour: 'var(--egg)' },
  vegetarian: { label: 'Veg', colour: 'var(--veg)' },
} as const

/**
 * `surface` — on a paper or card background.
 * `on-image` — over a photograph or placeholder tile; needs its own opaque
 *   ground and a lift, or the mark disappears into a bright plate.
 * `on-dark` — on the espresso ground.
 */
const VARIANTS = {
  surface: 'bg-[var(--surface-2)] text-[var(--ink-2)]',
  'on-image': 'bg-[rgba(255,253,249,.94)] text-[var(--ink-2)] backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,.12)]',
  'on-dark': 'bg-[rgba(247,241,230,.10)] text-[var(--dark-ink-2)]',
} as const

interface Props {
  dish: Pick<Dish, 'diet' | 'is_vegan'>
  /** Adds a Vegan pill alongside the base mark. Used in the detail panel. */
  detailed?: boolean
  variant?: keyof typeof VARIANTS
}

export function DietBadge({ dish, detailed = false, variant = 'surface' }: Props) {
  const base = DIET[dish.diet] ?? DIET.vegetarian
  const pill = `inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 ${VARIANTS[variant]}`

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={pill}>
        <Mark colour={base.colour} />
        {base.label}
      </span>

      {detailed && dish.is_vegan && <span className={pill}>Vegan</span>}
    </span>
  )
}
