import { NextResponse } from 'next/server'
import { getOrderWithMeals } from '@/lib/orders'
import { generateOrderPDF } from '@/lib/pdf/generate'
import { orderRef } from '@/lib/format'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const result = await getOrderWithMeals(id)
  if (!result) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateOrderPDF(result.order, result.meals)
  } catch (err) {
    console.error(`[pdf] generation failed for ${id}:`, err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mgprakash-order-${orderRef(id).toLowerCase()}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
