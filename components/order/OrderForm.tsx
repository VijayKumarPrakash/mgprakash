'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderProvider, useOrder } from './OrderContext'
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
  const [step, setStep] = useState<StepId>('contact')
  const [highestReached, setHighestReached] = useState(0)
  const { draft } = useOrder()
  const router = useRouter()

  // Removing the last meal invalidates the dish-selection and review steps, so
  // walk the furthest-reached marker back. Derived during render — an effect
  // would leave those steps clickable for a frame.
  if (draft.meals.length === 0 && highestReached >= 3) setHighestReached(2)

  function goToStep(targetIndex: number) {
    setStep(STEPS[targetIndex].id)
    if (targetIndex > highestReached) setHighestReached(targetIndex)
  }

  const handleSubmit = useCallback(async () => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to submit order')
    }
    const { id } = await res.json()
    router.push(`/order/${id}`)
  }, [draft, router])

  return (
    // pt-6 rather than py-12: the page now renders its own <h1> block above,
    // which owns the top spacing. A second py-12 here left a gap between the
    // heading and the step indicator big enough to read as a mistake.
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <StepIndicator
        currentStep={step}
        highestReached={highestReached}
        onStepClick={goToStep}
      />

      <div className="bg-[var(--paper)] rounded-3xl">
        {step === 'contact' && <ContactStep onNext={() => goToStep(1)} />}
        {step === 'event' && <EventStep onNext={() => goToStep(2)} onBack={() => setStep('contact')} />}
        {step === 'meals' && <MealsStep onNext={() => goToStep(3)} onBack={() => setStep('event')} />}
        {step === 'dishes' && (
          <DishSelectionStep
            dishes={dishes}
            onNext={() => goToStep(4)}
            onBack={() => setStep('meals')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            dishes={dishes}
            onBack={() => setStep('dishes')}
            onSubmit={handleSubmit}
          />
        )}
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
      <OrderFormInner dishes={dishes} />
    </OrderProvider>
  )
}
