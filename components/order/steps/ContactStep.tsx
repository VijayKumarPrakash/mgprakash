'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'

interface Props {
  onNext: () => void
}

export function ContactStep({ onNext }: Props) {
  const { draft, setContact } = useOrder()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!draft.client_name.trim()) e.client_name = 'Name is required'
    if (!draft.client_email.trim()) e.client_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.client_email))
      e.client_email = 'Please enter a valid email address'
    if (!draft.client_phone.trim()) e.client_phone = 'Phone number is required'
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
        <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Your contact details</h2>
        <p className="text-stone-500 mt-1">We'll use these to send your order confirmation.</p>
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

        <FormField label="Mobile number" error={errors.client_phone} required>
          <input
            type="tel"
            value={draft.client_phone}
            onChange={e => { setContact({ ...draft, client_phone: e.target.value }); setErrors(prev => ({ ...prev, client_phone: '' })) }}
            placeholder="e.g. +91 98765 43210"
            className="form-input"
          />
        </FormField>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleNext} className="btn-primary">
          Continue
        </button>
      </div>
    </div>
  )
}
