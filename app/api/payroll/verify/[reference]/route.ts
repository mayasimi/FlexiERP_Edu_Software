import { NextResponse } from 'next/server'
import { verifyPayrollPayment } from '@/lib/server/feature-store'

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const payment = verifyPayrollPayment(reference)

  if (!payment) {
    return NextResponse.json({ message: 'Payroll payment reference not found.' }, { status: 404 })
  }

  return NextResponse.json({ data: payment })
}
