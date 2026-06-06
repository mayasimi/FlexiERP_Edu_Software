import { NextResponse } from 'next/server'
import { listChats } from '@/lib/server/feature-store'

export async function GET() {
  return NextResponse.json({ data: listChats() })
}
