import { NextRequest, NextResponse } from 'next/server'
import { calculateTax } from '@/lib/server/feature-store'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  try {
    const tax = calculateTax({
      staff_id: typeof body.staff_id === 'string' ? body.staff_id : '',
      gross_pay: Number(body.gross_pay),
      pension: Number(body.pension || 0),
      relief: body.relief === undefined ? undefined : Number(body.relief),
    })
    return NextResponse.json({ data: tax }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to calculate tax.' }, { status: 422 })
  }
}
