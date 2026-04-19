import { getAllDishes } from '@/lib/dishes'
import { OrderForm } from '@/components/order/OrderForm'

export default async function NewOrderPage() {
  const dishes = await getAllDishes()
  return <OrderForm dishes={dishes} />
}
