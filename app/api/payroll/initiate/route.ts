import { NextRequest, NextResponse } from 'next/server'
import { initiatePayrollPayment } from '@/lib/server/feature-store'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  try {
    const payment = initiatePayrollPayment({
      amount: Number(body.amount),
      staff_ids: Array.isArray(body.staff_ids) ? body.staff_ids : [],
      payroll_period_id: typeof body.payroll_period_id === 'string' ? body.payroll_period_id : undefined,
    })
    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to initiate payroll.' }, { status: 422 })
  }
}
