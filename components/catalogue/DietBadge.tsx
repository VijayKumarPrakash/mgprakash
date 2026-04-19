import type { Diet } from '@/types'

const config: Record<string, { label: string; dot: string }> = {
  vegetarian: { label: 'Veg', dot: '#22c55e' },
  vegan: { label: 'Vegan', dot: '#16a34a' },
  jain: { label: 'Jain', dot: '#15803d' },
  'non-vegetarian': { label: 'Non-Veg', dot: '#ef4444' },
}

export function DietBadge({ diet }: { diet: Diet | string }) {
  const c = config[diet] ?? { label: diet, dot: '#94a3b8' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-100 rounded-full px-2.5 py-1">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}
