'use client'

import type { Dish } from '@/types'
import type { CatalogueFilters } from './CatalogueClient'

interface Props {
  dishes: Dish[]
  filters: CatalogueFilters
  onChange: (next: Partial<CatalogueFilters>) => void
}

type SelectProps = {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function FilterSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-stone-400 transition-colors min-w-[130px]"
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function FilterPanel({ dishes, filters, onChange }: Props) {
  const cuisines = [...new Set(dishes.map(d => d.cuisine).filter(Boolean) as string[])].sort()

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <FilterSelect
        label="Course"
        value={filters.course}
        onChange={v => onChange({ course: v as CatalogueFilters['course'] })}
        options={[
          { value: 'starter', label: 'Starter' },
          { value: 'main', label: 'Main' },
          { value: 'side', label: 'Side' },
          { value: 'snack', label: 'Snack' },
          { value: 'dessert', label: 'Dessert' },
          { value: 'beverage', label: 'Beverage' },
        ]}
      />

      <FilterSelect
        label="Cuisine"
        value={filters.cuisine}
        onChange={v => onChange({ cuisine: v })}
        options={cuisines.map(c => ({ value: c, label: c }))}
      />

      <FilterSelect
        label="Diet"
        value={filters.diet}
        onChange={v => onChange({ diet: v as CatalogueFilters['diet'] })}
        options={[
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'jain', label: 'Jain' },
          { value: 'non-vegetarian', label: 'Non-Vegetarian' },
        ]}
      />

      <FilterSelect
        label="Spice Level"
        value={filters.spice_level}
        onChange={v => onChange({ spice_level: v })}
        options={[
          { value: 'mild', label: 'Mild' },
          { value: 'medium', label: 'Medium' },
          { value: 'hot', label: 'Hot' },
        ]}
      />
    </div>
  )
}
