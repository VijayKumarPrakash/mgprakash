'use client'

import { useState } from 'react'
import { useOrder } from '../OrderContext'
import { FormField } from '../FormField'

/**
 * `digits` is the national number length, as a [min, max] pair — most of these
 * are a single fixed length and a couple genuinely vary. It drives `maxLength`
 * on the input and the inline check, so an Indian mobile is held to exactly ten
 * and nobody is told their perfectly good Malaysian number is wrong.
 */
const COUNTRY_CODES = [
  { code: '+91',  label: 'IN +91',  digits: [10, 10] },
  { code: '+1',   label: 'US +1',   digits: [10, 10] },
  { code: '+44',  label: 'GB +44',  digits: [10, 10] },
  { code: '+61',  label: 'AU +61',  digits: [9, 9] },
  { code: '+971', label: 'AE +971', digits: [9, 9] },
  { code: '+65',  label: 'SG +65',  digits: [8, 8] },
  { code: '+60',  label: 'MY +60',  digits: [9, 10] },
] as const

type CountryCode = (typeof COUNTRY_CODES)[number]

const codeFor = (code: string): CountryCode =>
  COUNTRY_CODES.find(c => c.code === code) ?? COUNTRY_CODES[0]

/**
 * The error for a national number, or '' if it is acceptable.
 *
 * An empty number is acceptable: the field is optional. Anything typed has to
 * be complete, though — a half-entered mobile is worse than none, because the
 * business will try to ring it.
 */
function phoneError(code: string, digits: string): string {
  if (!digits) return ''
  const [min, max] = codeFor(code).digits
  if (digits.length < min || digits.length > max) {
    return min === max
      ? `A ${code} number is ${min} digits — you have entered ${digits.length}.`
      : `A ${code} number is ${min}–${max} digits — you have entered ${digits.length}.`
  }
  return ''
}

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
  // Annotated `string` rather than inferred: COUNTRY_CODES is `as const`, so the
  // inferred type would be the literal union and the <select>'s own
  // `e.target.value` — a plain string — could not be assigned back.
  const [countryCode, setCountryCode] = useState<string>(
    () => COUNTRY_CODES.find(c => draft.client_phone.startsWith(c.code))?.code ?? '+91'
  )
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const match = COUNTRY_CODES.find(c => draft.client_phone.startsWith(c.code))
    // Digits only, even when reading back a value stored before this field
    // started stripping them.
    return match ? draft.client_phone.slice(match.code.length).replace(/\D/g, '') : ''
  })

  /**
   * Validated on every keystroke rather than on submit.
   *
   * The field used to accept anything at all — letters, brackets, a sentence —
   * and said nothing until the server rejected the whole order three steps
   * later, by which point the customer had left the field long behind. Now the
   * input refuses to hold a non-digit at all and the length is checked as it is
   * typed, so the message appears next to the field being typed into.
   */
  function syncPhone(code: string, num: string) {
    setContact({ ...draft, client_phone: num ? `${code} ${num}` : '' })
    setErrors(prev => ({ ...prev, client_phone: phoneError(code, num) }))
  }

  function onPhoneChange(raw: string) {
    // Stripped, not rejected. Pasting "+91 98801 93165" or "(988) 019-3165"
    // should work — the customer's clipboard is not the enemy — so the
    // separators are dropped and the digits kept.
    const digits = raw.replace(/\D/g, '').slice(0, codeFor(countryCode).digits[1])
    setPhoneNumber(digits)
    syncPhone(countryCode, digits)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!draft.client_name.trim()) e.client_name = 'Name is required'
    if (!draft.client_email.trim()) e.client_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.client_email))
      e.client_email = 'Please enter a valid email address'
    const phone = phoneError(countryCode, phoneNumber)
    if (phone) e.client_phone = phone
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
              onChange={e => {
                const next = e.target.value
                setCountryCode(next)
                // Re-truncate: switching from a 10-digit country to an 8-digit
                // one must not leave two digits stranded past the new maximum.
                const trimmed = phoneNumber.slice(0, codeFor(next).digits[1])
                setPhoneNumber(trimmed)
                syncPhone(next, trimmed)
              }}
              className="form-input w-28 shrink-0"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              type="tel"
              // `inputMode` rather than type="number": a phone number is a
              // string of digits, not a quantity, and a number input would give
              // it spinners and strip a leading zero.
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={codeFor(countryCode).digits[1]}
              value={phoneNumber}
              onChange={e => onPhoneChange(e.target.value)}
              placeholder={codeFor(countryCode).digits[1] === 10 ? '98765 43210' : 'Mobile number'}
              aria-describedby="phone-hint"
              className="form-input flex-1"
            />
          </div>
          <p id="phone-hint" className="text-[11.5px] text-[var(--ink-3)] mt-1.5">
            Digits only. We only use this if we need to reach you about the quote.
          </p>
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
