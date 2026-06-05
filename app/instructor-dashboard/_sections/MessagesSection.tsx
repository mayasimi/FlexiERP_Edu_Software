'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Send, Search, ArrowLeft, MessageCircle, Clock } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { useAuthStore } from '@/lib/auth-store'
import type { Conversation, Message } from '../_types'

export default function MessagesSection() {
  const queryClient = useQueryClient()
  const { user }    = useAuthStore()

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery,          setSearchQuery]          = useState('')
  const [newMessage,           setNewMessage]           = useState('')
  const [showNewConversation,  setShowNewConversation]  = useState(false)
  const [newConvForm,          setNewConvForm]          = useState({
    parentName: '', studentName: '', studentGroup: '', subject: '', body: '',
  })

  // ── Fetch real conversations ───────────────────────────────────────────────
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['teacher-messages'],
    queryFn:  () => teacherApi.getMessages().then(r => r.data),
  })

  // ── Send message mutation ─────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      teacherApi.sendMessage(conversationId, body),
    onSuccess: (newMsg) => {
      // Optimistically append the new message to selected conversation
      setSelectedConversation(prev => {
        if (!prev) return prev
        return {
          ...prev,
          messages:      [...(prev.messages ?? []), newMsg.data],
          lastMessage:   newMessage,
          lastTimestamp: new Date().toISOString(),
        }
      })
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['teacher-messages'] })
    },
    onError: () => toast.error('Failed to send message.'),
  })

  const teacherName    = user?.name ?? 'Teacher'
  const teacherInitials = teacherName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  // ── Filtered conversations ─────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c: Conversation) =>
    c.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum: number, c: Conversation) => sum + (c.unreadCount ?? 0), 0)

  const openConversation = (conv: Conversation) => {
    setSelectedConversation(conv)
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return
    sendMutation.mutate({ conversationId: selectedConversation.id, body: newMessage })
  }

  const formatTime = (timestamp: string) => {
    const date    = new Date(timestamp)
    const now     = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="Communicate directly with parents and guardians."
        action={{ label: 'New Message', icon: <Send size={14} />, onClick: () => setShowNewConversation(true) }} />

      <div className="px-6 pb-8">
        <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>

            {/* ── Conversation List ──────────────────────────────────────── */}
            <div className="flex flex-col" style={{ width: 340, borderRight: '1px solid #E4E1D8' }}>
              <div className="p-3" style={{ borderBottom: '1px solid #E4E1D8' }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6660' }} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="input pl-9 text-sm" placeholder="Search conversations..." />
                </div>
                {totalUnread > 0 && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#991B1B' }}>{totalUnread} unread</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading && <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading messages...</p>}
                {filteredConversations.map((conv: Conversation) => {
                  const isActive = selectedConversation?.id === conv.id
                  return (
                    <button key={conv.id} onClick={() => openConversation(conv)}
                      className="w-full text-left p-3 transition-all flex gap-3"
                      style={{
                        background:  isActive ? 'rgba(201,160,32,0.08)' : 'transparent',
                        borderBottom: '1px solid #E4E1D8',
                        borderLeft:   isActive ? '3px solid #C9A020' : '3px solid transparent',
                      }}>
                      <div className="relative flex-shrink-0">
                        <StudentAvatar initials={conv.parentAvatar} />
                        {(conv.unreadCount ?? 0) > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#EF4444' }}>
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold truncate">{conv.parentName}</span>
                          <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: '#6B6660' }}>{formatTime(conv.lastTimestamp)}</span>
                        </div>
                        <p className="text-xs truncate" style={{ color: '#6B6660' }}>Re: {conv.studentName} ({conv.studentGroup})</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: (conv.unreadCount ?? 0) > 0 ? '#1A1A1A' : '#6B6660', fontWeight: (conv.unreadCount ?? 0) > 0 ? 600 : 400 }}>{conv.lastMessage}</p>
                      </div>
                    </button>
                  )
                })}
                {!isLoading && filteredConversations.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle size={24} className="mx-auto mb-2" style={{ color: '#6B6660' }} />
                    <p className="text-xs" style={{ color: '#6B6660' }}>No conversations found</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Message Thread ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #E4E1D8' }}>
                    <button onClick={() => setSelectedConversation(null)} className="md:hidden"><ArrowLeft size={18} /></button>
                    <StudentAvatar initials={selectedConversation.parentAvatar} />
                    <div>
                      <p className="font-semibold text-sm">{selectedConversation.parentName}</p>
                      <p className="text-xs" style={{ color: '#6B6660' }}>Parent of {selectedConversation.studentName} · {selectedConversation.studentGroup}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(selectedConversation.messages ?? []).map((msg: Message) => {
                      const isTeacher = msg.senderRole === 'teacher'
                      return (
                        <div key={msg.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[70%]">
                            <div className="flex items-center gap-2 mb-1">
                              {!isTeacher && <StudentAvatar initials={msg.senderAvatar} size="sm" />}
                              <span className="text-xs font-medium">{msg.senderName}</span>
                              <span className="text-[10px] flex items-center gap-1" style={{ color: '#6B6660' }}>
                                <Clock size={10} /> {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl text-sm whitespace-pre-wrap"
                              style={{
                                background: isTeacher ? 'rgba(201,160,32,0.10)' : '#F7F6F3',
                                border: `1px solid ${isTeacher ? 'rgba(201,160,32,0.25)' : '#E4E1D8'}`,
                                borderTopRightRadius: isTeacher ? 4 : 12,
                                borderTopLeftRadius:  isTeacher ? 12 : 4,
                              }}>
                              {msg.body}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-4" style={{ borderTop: '1px solid #E4E1D8' }}>
                    <div className="flex gap-2">
                      <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        className="input flex-1 resize-none" rows={2}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)" />
                      <button onClick={sendMessage}
                        disabled={!newMessage.trim() || sendMutation.isPending}
                        className="btn-gold self-end"
                        style={{ opacity: newMessage.trim() ? 1 : 0.5 }}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-3" style={{ color: '#E4E1D8' }} />
                    <p className="font-semibold text-base mb-1">Select a conversation</p>
                    <p className="text-sm" style={{ color: '#6B6660' }}>Choose a parent from the list to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Conversation Modal — UI only for now */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">New Message</h2>
              <button onClick={() => setShowNewConversation(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <span className="text-lg">×</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Parent Name</label>
                  <input value={newConvForm.parentName} onChange={e => setNewConvForm(f => ({ ...f, parentName: e.target.value }))} className="input" placeholder="e.g. Mrs. Okafor" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Student Name</label>
                  <input value={newConvForm.studentName} onChange={e => setNewConvForm(f => ({ ...f, studentName: e.target.value }))} className="input" placeholder="e.g. Emeka Okafor" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
                <input value={newConvForm.subject} onChange={e => setNewConvForm(f => ({ ...f, subject: e.target.value }))} className="input" placeholder="e.g. Academic Performance" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Message</label>
                <textarea value={newConvForm.body} onChange={e => setNewConvForm(f => ({ ...f, body: e.target.value }))} className="input" rows={5} placeholder="Type your message..." />
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: '#6B6660' }}>
              Note: Starting new conversations from existing parent records coming in a future update.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewConversation(false)} className="btn-outline">Cancel</button>
              <button onClick={() => setShowNewConversation(false)} className="btn-gold">
                <Send size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
