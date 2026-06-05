'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

type Chat = {
  id: string
  subject: string
  unread_count: number
}

type ChatMessage = {
  id: string
  sender_role: 'school_admin' | 'support'
  body: string
  read_at: string | null
  created_at: string
}

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const activeChat = chats[0]
  const unreadCount = useMemo(() => chats.reduce((sum, chat) => sum + chat.unread_count, 0), [chats])

  const loadChats = async () => {
    const response = await fetch('/api/chats')
    if (!response.ok) throw new Error('Unable to load support chats.')
    const payload = await response.json()
    setChats(payload.data || [])
  }

  const loadMessages = async (markRead = false) => {
    if (!activeChat) return

    const response = await fetch(`/api/chats/${activeChat.id}/messages?markRead=${markRead}`)
    if (!response.ok) throw new Error('Unable to load chat messages.')
    const payload = await response.json()
    setMessages(payload.data || [])
    if (markRead) {
      setChats((current) => current.map((chat) => chat.id === activeChat.id ? { ...chat, unread_count: 0 } : chat))
    }
  }

  useEffect(() => {
    loadChats().catch((loadError) => setError(loadError.message))
  }, [])

  useEffect(() => {
    if (!activeChat) return

    loadMessages(isOpen).catch((loadError) => setError(loadError.message))
    const timer = window.setInterval(() => {
      loadChats().catch(() => undefined)
      loadMessages(isOpen).catch(() => undefined)
    }, 10000)

    return () => window.clearInterval(timer)
  }, [activeChat?.id, isOpen])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeChat || !draft.trim()) return

    setIsSending(true)
    setError('')

    try {
      const response = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message || 'Unable to send message.')
      }

      setDraft('')
      await loadMessages(true)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      {isOpen && (
        <div className="mb-3 flex h-[460px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-[#E4E1D8] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#0D0D0D] px-4 py-3 text-white">
            <div>
              <p className="m-0 text-sm font-bold">GWPL Support</p>
              <p className="m-0 text-xs text-[#D7D2CB]">{activeChat?.subject || 'Technical support'}</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-1 text-[#C9A020] hover:bg-white/10" aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAFAF8] p-4">
            {messages.map((message) => {
              const isAdmin = message.sender_role === 'school_admin'
              return (
                <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${isAdmin ? 'bg-[#C9A020] text-[#0D0D0D]' : 'bg-white text-[#0D0D0D] shadow-sm'}`}>
                    <p className="m-0 leading-5">{message.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(message.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-[#E4E1D8] bg-white p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[#E4E1D8] px-3 py-2 text-sm outline-none focus:border-[#C9A020]"
              placeholder="Type a message..."
            />
            <button type="submit" disabled={isSending || !draft.trim()} className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#C9A020] text-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0D0D0D] text-[#C9A020] shadow-xl"
        aria-label="Open GWPL support chat"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
