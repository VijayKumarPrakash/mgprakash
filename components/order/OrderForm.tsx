'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderProvider, useOrder } from './OrderContext'
import { ToastProvider } from './Toast'
import { ContactStep } from './steps/ContactStep'
import { EventStep } from './steps/EventStep'
import { MealsStep } from './steps/MealsStep'
import { DishSelectionStep } from './steps/DishSelectionStep'
import { ReviewStep } from './steps/ReviewStep'
import type { Dish } from '@/types'

// `as const` matters: without it `StepId` widens to `string`, which is what
// forced the three `as StepId` casts this file used to carry and would have
// let a typo'd step id through the type checker untouched.
const STEPS = [
  { id: 'contact', label: 'Contact' },
  { id: 'event', label: 'Event' },
  { id: 'meals', label: 'Meals' },
  { id: 'dishes', label: 'Dishes' },
  { id: 'review', label: 'Review' },
] as const

type StepId = (typeof STEPS)[number]['id']

function StepIndicator({
  currentStep,
  highestReached,
  onStepClick,
}: {
  currentStep: StepId
  highestReached: number
  onStepClick: (index: number) => void
}) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep)
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const isClickable = i <= highestReached
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer hover:opacity-80 ${
                    i < currentIndex
                      ? 'text-white'
                      : i === currentIndex
                      ? 'text-white ring-4 ring-offset-2'
                      : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                  }`}
                  style={
                    i <= currentIndex
                      ? { background: 'var(--accent)', ...(i === currentIndex ? { '--tw-ring-color': 'color-mix(in srgb, var(--accent) 25%, transparent)' } as React.CSSProperties : {}) }
                      : {}
                  }
                >
                  {i < currentIndex ? '✓' : i + 1}
                </button>
              ) : (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    i === currentIndex ? 'text-white ring-4 ring-offset-2' : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                  }`}
                  style={
                    i === currentIndex
                      ? { background: 'var(--accent)', '--tw-ring-color': 'color-mix(in srgb, var(--accent) 25%, transparent)' } as React.CSSProperties
                      : {}
                  }
                >
                  {i + 1}
                </div>
              )}
              <span className={`text-xs hidden sm:block ${i === currentIndex ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4 transition-all"
                style={{ background: i < currentIndex ? 'var(--accent)' : 'var(--line)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function OrderFormInner({ dishes }: { dishes: Dish[] }) {
  const { draft, restoredStep, discardStoredDraft, noteStep } = useOrder()

  /**
   * Opens on the step the customer left from, when there was one.
   *
   * Seeded in the initialiser rather than corrected afterwards: the draft it
   * belongs to was restored synchronously too, so there is no frame in which
   * the form shows step one holding a fully populated order.
   */
  const [step, setStep] = useState<StepId>(() => {
    const resumed = STEPS.find(s => s.id === restoredStep)
    return resumed?.id ?? 'contact'
  })
  const [highestReached, setHighestReached] = useState(() => {
    const i = STEPS.findIndex(s => s.id === restoredStep)
    return i > 0 ? i : 0
  })
  const router = useRouter()

  /**
   * Honeypot.
   *
   * Deliberately a real text input rather than `type="hidden"`, because the
   * bots worth catching fill visible fields and skip hidden ones. It is held in
   * a ref rather than the reducer: it is not part of the order, and putting it
   * in `OrderDraft` would mean every consumer of that type — validation, the
   * PDF, both emails — carrying a field that exists only to be empty.
   */
  const botField = useRef<HTMLInputElement>(null)

  // Removing the last meal invalidates the dish-selection and review steps, so
  // walk the furthest-reached marker back. Derived during render — an effect
  // would leave those steps clickable for a frame.
  if (draft.meals.length === 0 && highestReached >= 3) setHighestReached(2)

  function goToStep(targetIndex: number) {
    const next = STEPS[targetIndex].id
    setStep(next)
    // Told to the provider so it is saved with the draft — this is what lets a
    // customer come back to dish selection rather than to the contact step.
    noteStep(next)
    if (targetIndex > highestReached) setHighestReached(targetIndex)
  }

  const handleSubmit = useCallback(async () => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, bot_field: botField.current?.value ?? '' }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to submit order')
    }
    const { id } = await res.json()
    // The draft is now an order. Cleared before navigating, so returning to
    // /order/new later offers a fresh form rather than resurrecting a request
    // that has already been sent.
    discardStoredDraft()
    router.push(`/order/${id}`)
  }, [draft, router, discardStoredDraft])

  return (
    // pt-6 rather than py-12: the page now renders its own <h1> block above,
    // which owns the top spacing. A second py-12 here left a gap between the
    // heading and the step indicator big enough to read as a mistake.
    <div className="pt-6 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <StepIndicator
          currentStep={step}
          highestReached={highestReached}
          onStepClick={goToStep}
        />
      </div>

      {/*
        Off-screen rather than `display:none` — some bots skip anything they can
        tell is not rendered. `aria-hidden` and `tabIndex={-1}` keep it out of
        the accessibility tree and the tab order, so a screen reader is never
        asked to fill a trap, and `autoComplete="off"` stops a browser
        helpfully populating it.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto w-px h-px overflow-hidden">
        <label htmlFor="bot_field">Do not fill this in</label>
        <input
          ref={botField}
          id="bot_field"
          name="bot_field"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {/*
        Every other step stays at the form's usual 672px column. The dish
        step alone widens to match /menu (max-w-6xl) — it renders the same
        card grid, and at 672px that grid drew three ~200px cards with
        150px-tall photos, the most cramped this catalogue ever looks, for
        the one step where a customer is picking dishes for an entire
        wedding. The step indicator above stays fixed-width regardless, so
        only the content below it shifts.
      */}
      <div className={`mx-auto px-4 sm:px-6 ${step === 'dishes' ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <div className="bg-[var(--paper)] rounded-3xl">
          {step === 'contact' && <ContactStep onNext={() => goToStep(1)} />}
          {step === 'event' && <EventStep onNext={() => goToStep(2)} onBack={() => goToStep(0)} />}
          {step === 'meals' && <MealsStep onNext={() => goToStep(3)} onBack={() => goToStep(1)} />}
          {step === 'dishes' && (
            <DishSelectionStep
              dishes={dishes}
              onNext={() => goToStep(4)}
              onBack={() => goToStep(2)}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              dishes={dishes}
              onBack={() => goToStep(3)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function OrderForm({
  dishes,
  initialName,
  initialEmail,
}: {
  dishes: Dish[]
  initialName?: string
  initialEmail?: string
}) {
  return (
    <OrderProvider initialContact={{ name: initialName, email: initialEmail }}>
      <ToastProvider>
        <OrderFormInner dishes={dishes} />
      </ToastProvider>
    </OrderProvider>
  )
}
