'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'
import type { EventType } from '@/types'

interface Props {
  onNext: () => void
  onBack: () => void
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'wedding',      label: 'Wedding' },
  { value: 'engagement',   label: 'Engagement' },
  { value: 'birthday',     label: 'Birthday' },
  { value: 'anniversary',  label: 'Anniversary' },
  { value: 'housewarming', label: 'Gruha Pravesha / Housewarming' },
  { value: 'baby_shower',  label: 'Seemantha / Baby Shower' },
  { value: 'namakarana',   label: 'Namakarana' },
  { value: 'religious',    label: 'Religious / Prasad' },
  { value: 'party',        label: 'Party' },
  { value: 'corporate',    label: 'Corporate' },
  { value: 'funeral',      label: 'Funeral / Condolence' },
  { value: 'other',        label: 'Other' },
]

export function EventStep({ onNext, onBack }: Props) {
  const { draft, setEvent } = useOrder()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!draft.event_name.trim()) e.event_name = 'Event name is required'
    if (!draft.event_type) e.event_type = 'Please select an event type'
    return e
  }

  function handleNext() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">About your event</h2>
        <p className="text-stone-500 mt-1">Give your event a name and tell us what kind it is.</p>
      </div>

      <div className="space-y-4">
        <FormField label="Event name" error={errors.event_name} required>
          <input
            type="text"
            value={draft.event_name}
            onChange={e => { setEvent({ ...draft, event_name: e.target.value }); setErrors(prev => ({ ...prev, event_name: '' })) }}
            placeholder="e.g. Sharma Wedding Reception"
            className="form-input"
          />
        </FormField>

        <FormField label="Event type" error={errors.event_type} required>
          <div className="grid grid-cols-2 gap-3">
            {EVENT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setEvent({ ...draft, event_type: value }); setErrors(prev => ({ ...prev, event_type: '' })) }}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  draft.event_type === value
                    ? 'border-transparent text-white'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
                style={draft.event_type === value ? { background: 'var(--color-accent)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn-secondary">Back</button>
        <button onClick={handleNext} className="btn-primary">Continue</button>
      </div>
    </div>
  )
}
