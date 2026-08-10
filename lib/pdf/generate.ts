import { renderToBuffer } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { OrderPDF } from '@/components/pdf/OrderPDF'
import type { Order, Meal } from '@/types'

/**
 * `renderToBuffer` is typed against React-PDF's own `DocumentProps` element,
 * which a plain `ReactElement` is not assignable to — the two React type trees
 * differ across the package boundary. This used to be papered over with an
 * `any` alias and an eslint-disable; casting only at the call site keeps the
 * exported signature honest and confines the workaround to one line.
 */
type PdfElement = Parameters<typeof renderToBuffer>[0]

export async function generateOrderPDF(
  order: Order,
  meals: Meal[],
  isDraft = false
): Promise<Buffer> {
  const element = createElement(OrderPDF, { order, meals, isDraft }) as ReactElement
  return renderToBuffer(element as PdfElement)
}
