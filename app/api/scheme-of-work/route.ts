import { NextRequest, NextResponse } from 'next/server'
import { searchSchemeOfWork } from '@/lib/server/feature-store'

export async function GET(request: NextRequest) {
  const subject = request.nextUrl.searchParams.get('subject') || ''
  const term = request.nextUrl.searchParams.get('term') || undefined
  const className = request.nextUrl.searchParams.get('class') || undefined

  if (!subject.trim()) {
    return NextResponse.json({ message: 'subject query parameter is required.' }, { status: 422 })
  }

  return NextResponse.json({ data: searchSchemeOfWork({ subject, term, className }) })
}
