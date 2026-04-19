'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OrderProvider, useOrder } from './OrderContext'
import { ContactStep } from './steps/ContactStep'
import { EventStep } from './steps/EventStep'
import { MealsStep } from './steps/MealsStep'
import { DishSelectionStep } from './steps/DishSelectionStep'
import { ReviewStep } from './steps/ReviewStep'
import type { Dish } from '@/types'

const STEPS = [
  { id: 'contact', label: 'Contact' },
  { id: 'event', label: 'Event' },
  { id: 'meals', label: 'Meals' },
  { id: 'dishes', label: 'Dishes' },
  { id: 'review', label: 'Review' },
]

type StepId = typeof STEPS[number]['id']

function StepIndicator({ currentStep }: { currentStep: StepId }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep)
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < currentIndex
                  ? 'text-white'
                  : i === currentIndex
                  ? 'text-white ring-4 ring-offset-2'
                  : 'bg-stone-100 text-stone-400'
              }`}
              style={
                i <= currentIndex
                  ? { background: 'var(--color-accent)', ...(i === currentIndex ? { '--tw-ring-color': 'color-mix(in srgb, var(--color-accent) 25%, transparent)' } as React.CSSProperties : {}) }
                  : {}
              }
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === currentIndex ? 'font-medium text-[#1a1a1a]' : 'text-stone-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2 mb-4 transition-all"
              style={{ background: i < currentIndex ? 'var(--color-accent)' : '#e7e5e4' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function OrderFormInner({ dishes }: { dishes: Dish[] }) {
  const [step, setStep] = useState<StepId>('contact')
  const { draft } = useOrder()
  const router = useRouter()

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <StepIndicator currentStep={step} />

      <div className="bg-[#FAFAF8] rounded-3xl">
        {step === 'contact' && <ContactStep onNext={() => setStep('event')} />}
        {step === 'event' && <EventStep onNext={() => setStep('meals')} onBack={() => setStep('contact')} />}
        {step === 'meals' && <MealsStep onNext={() => setStep('dishes')} onBack={() => setStep('event')} />}
        {step === 'dishes' && (
          <DishSelectionStep
            dishes={dishes}
            onNext={() => setStep('review')}
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

export function OrderForm({ dishes }: { dishes: Dish[] }) {
  return (
    <OrderProvider>
      <OrderFormInner dishes={dishes} />
    </OrderProvider>
  )
}
