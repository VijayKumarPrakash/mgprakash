import { getAllDishes } from '@/lib/dishes'
import { createCookieClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/order/OrderForm'

export default async function NewOrderPage() {
  const [dishes, supabase] = await Promise.all([getAllDishes(), createCookieClient()])
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <OrderForm
      dishes={dishes}
      initialName={user?.user_metadata?.name as string | undefined}
      initialEmail={user?.email ?? undefined}
    />
  )
}
