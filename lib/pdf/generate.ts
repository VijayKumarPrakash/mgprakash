import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { OrderPDF } from '@/components/pdf/OrderPDF'
import type { Order, Meal, Dish } from '@/types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactElement = any

export async function generateOrderPDF(
  order: Order,
  meals: Meal[],
  dishMap: Record<string, Dish>
): Promise<Buffer> {
  const element = createElement(OrderPDF, { order, meals, dishMap }) as AnyReactElement
  return renderToBuffer(element)
}
