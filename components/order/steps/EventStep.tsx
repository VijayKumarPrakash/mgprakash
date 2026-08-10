'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'
import { EVENT_TYPES, EVENT_TYPE_LABELS } from '@/types'

interface Props {
  onNext: () => void
  onBack: () => void
}

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
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">About your event</h2>
        <p className="text-[var(--ink-3)] mt-1">Give your event a name and tell us what kind it is.</p>
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
            {EVENT_TYPES.map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={draft.event_type === value}
                onClick={() => { setEvent({ ...draft, event_type: value }); setErrors(prev => ({ ...prev, event_type: '' })) }}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  draft.event_type === value
                    ? 'border-transparent text-[var(--accent-ink)]'
                    : 'border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--line-strong)] bg-[var(--surface)]'
                }`}
                style={draft.event_type === value ? { background: 'var(--accent)' } : {}}
              >
                {EVENT_TYPE_LABELS[value]}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="btn btn-secondary">Back</button>
        <button onClick={handleNext} className="btn btn-primary">Continue</button>
      </div>
    </div>
  )
}
