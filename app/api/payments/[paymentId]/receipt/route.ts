import { NextResponse } from 'next/server'
import { createPdfReceipt, getReceipt } from '@/lib/server/feature-store'

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const receipt = getReceipt(paymentId)

  if (!receipt) {
    return NextResponse.json({ message: 'Payment receipt not found.' }, { status: 404 })
  }

  const pdf = createPdfReceipt(receipt)
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${receipt.payment_reference}.pdf"`,
    },
  })
}
