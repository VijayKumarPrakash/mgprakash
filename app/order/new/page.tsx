import type { Metadata } from 'next'
import { getAllDishes } from '@/lib/dishes'
import { createCookieClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/order/OrderForm'

export const metadata: Metadata = {
  title: 'Get a Quote',
  description:
    'Tell us about your event, pick your dishes, and we will send a written quote the same day.',
}

/**
 * Signing in is optional here — it only pre-fills the contact step. So an
 * unreachable or unconfigured Supabase must not block the quote form, which is
 * the single most important page on the site.
 */
async function getSignedInUser() {
  try {
    const supabase = await createCookieClient()
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export default async function NewOrderPage() {
  const [dishes, user] = await Promise.all([getAllDishes(), getSignedInUser()])

  return (
    <OrderForm
      dishes={dishes}
      initialName={user?.user_metadata?.name as string | undefined}
      initialEmail={user?.email ?? undefined}
    />
  )
}
