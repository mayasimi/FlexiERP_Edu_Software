import { NextRequest, NextResponse } from 'next/server'
import { getChatMessages, sendChatMessage, type SenderRole } from '@/lib/server/feature-store'

export async function GET(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  const markRead = request.nextUrl.searchParams.get('markRead') === 'true'
  const messages = getChatMessages(chatId, markRead)

  if (!messages) {
    return NextResponse.json({ message: 'Chat not found.' }, { status: 404 })
  }

  return NextResponse.json({ data: messages })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params
  const body = await request.json().catch(() => ({}))
  const messageBody = typeof body.body === 'string' ? body.body.trim() : ''
  const senderRole = (body.sender_role === 'support' ? 'support' : 'school_admin') as SenderRole

  if (!messageBody) {
    return NextResponse.json({ message: 'Message body is required.' }, { status: 422 })
  }

  const message = sendChatMessage(chatId, messageBody, senderRole)
  if (!message) {
    return NextResponse.json({ message: 'Chat not found.' }, { status: 404 })
  }

  return NextResponse.json({ data: message }, { status: 201 })
}
