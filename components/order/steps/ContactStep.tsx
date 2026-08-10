'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'

const COUNTRY_CODES = [
  { code: '+91',  label: 'IN +91' },
  { code: '+1',   label: 'US +1' },
  { code: '+44',  label: 'GB +44' },
  { code: '+61',  label: 'AU +61' },
  { code: '+971', label: 'AE +971' },
  { code: '+65',  label: 'SG +65' },
  { code: '+60',  label: 'MY +60' },
]

interface Props {
  onNext: () => void
}

export function ContactStep({ onNext }: Props) {
  const { draft, setContact } = useOrder()
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Split the stored "+91 9880193165" back into its two inputs. Done as a lazy
  // initialiser rather than a mount effect: an effect would render once with
  // the wrong values and then immediately re-render, which is visible as a
  // flicker in the country-code select when navigating back to this step.
  const [countryCode, setCountryCode] = useState(
    () => COUNTRY_CODES.find(c => draft.client_phone.startsWith(c.code))?.code ?? '+91'
  )
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const match = COUNTRY_CODES.find(c => draft.client_phone.startsWith(c.code))
    return match ? draft.client_phone.slice(match.code.length).trim() : ''
  })

  function syncPhone(code: string, num: string) {
    setContact({ ...draft, client_phone: num ? `${code} ${num}` : '' })
    setErrors(prev => ({ ...prev, client_phone: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!draft.client_name.trim()) e.client_name = 'Name is required'
    if (!draft.client_email.trim()) e.client_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.client_email))
      e.client_email = 'Please enter a valid email address'
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
        <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Your contact details</h2>
        <p className="text-[var(--ink-3)] mt-1">We&rsquo;ll use these to send your quote summary.</p>
      </div>

      <div className="space-y-4">
        <FormField label="Full name" error={errors.client_name} required>
          <input
            type="text"
            value={draft.client_name}
            onChange={e => { setContact({ ...draft, client_name: e.target.value }); setErrors(prev => ({ ...prev, client_name: '' })) }}
            placeholder="e.g. Priya Sharma"
            className="form-input"
          />
        </FormField>

        <FormField label="Email address" error={errors.client_email} required>
          <input
            type="email"
            value={draft.client_email}
            onChange={e => { setContact({ ...draft, client_email: e.target.value }); setErrors(prev => ({ ...prev, client_email: '' })) }}
            placeholder="e.g. priya@example.com"
            className="form-input"
          />
        </FormField>

        <FormField label="Mobile number (optional)" error={errors.client_phone}>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={e => { setCountryCode(e.target.value); syncPhone(e.target.value, phoneNumber) }}
              className="form-input w-28 shrink-0"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => { setPhoneNumber(e.target.value); syncPhone(countryCode, e.target.value) }}
              placeholder="98765 43210"
              className="form-input flex-1"
            />
          </div>
        </FormField>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleNext} className="btn btn-primary">
          Continue
        </button>
      </div>
    </div>
  )
}
