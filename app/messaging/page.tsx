'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { getInitials } from '@/lib/utils'
import {
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  Forward,
  Inbox,
  Link2,
  Mail,
  Pencil,
  Reply,
  Search,
  Send,
  Trash2,
  User,
  Users,
} from 'lucide-react'

type FolderId = 'inbox' | 'sent' | 'drafts' | 'bulk'
type ViewMode = FolderId | 'compose' | 'account'

interface MessageRecord {
  id: string
  folder: FolderId
  sender: string
  senderEmail: string
  to: string
  subject: string
  preview: string
  time: string
  date: string
  read: boolean
  label: string | null
  body: string
}

interface ConnectedAccount {
  email: string
  provider: string
}

interface ComposeDraft {
  recipients: string
  subject: string
  body: string
}

const CONNECTED_ACCOUNT_KEY = 'flexierp.messaging.connectedAccount'
const parentClassOptions = ['Nursery 1', 'Nursery 2', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']

const bulkMessages: MessageRecord[] = [
  {
    id: 'bulk-teachers',
    folder: 'bulk',
    sender: 'All Teachers',
    senderEmail: 'admin@flexierp.edu',
    to: 'All teachers',
    subject: 'Message All Teachers',
    preview: 'Send one email to every teacher account.',
    time: 'Teachers',
    date: 'Ready to compose',
    read: true,
    label: 'Faculty',
    body: `Bulk email option\n\nAudience: All Teachers\n\nUse this option to send one message to every teacher account connected to the school portal.`,
  },
  {
    id: 'bulk-all-parents',
    folder: 'bulk',
    sender: 'All Parents',
    senderEmail: 'admin@flexierp.edu',
    to: 'All parents',
    subject: 'Message All Parents',
    preview: 'Send one email to every parent account.',
    time: 'Parents',
    date: 'Ready to compose',
    read: true,
    label: 'Students',
    body: `Bulk email option\n\nAudience: All Parents\n\nUse this option to send one message to every parent account connected to the school portal.`,
  },
  ...parentClassOptions.map((className): MessageRecord => ({
    id: `bulk-parents-${className.toLowerCase().replace(/\s+/g, '-')}`,
    folder: 'bulk',
    sender: `Parents - ${className}`,
    senderEmail: 'admin@flexierp.edu',
    to: `${className} parents`,
    subject: `Message ${className} Parents`,
    preview: `Send one email to all ${className} parents.`,
    time: className,
    date: 'Ready to compose',
    read: true,
    label: 'Students',
    body: `Bulk email option\n\nAudience: ${className} Parents\n\nUse this option to send one message to every parent with a student in ${className}.`,
  })),
]

const MESSAGES: MessageRecord[] = [
  {
    id: 'inbox-1',
    folder: 'inbox',
    sender: 'Dr. Emily Chen',
    senderEmail: 'e.chen@flexierp.edu',
    to: 'admin@flexierp.edu',
    subject: 'Q3 Syllabus Updates Needed',
    preview: 'Please review the attached changes for the new term.',
    time: '09:42 AM',
    date: 'Jun 5, 2026, 9:42 AM',
    read: false,
    label: 'Faculty',
    body: `Hello Administration Team,\n\nPlease review the attached syllabus changes for the new term. I would like confirmation before we publish the updated course outline to students.\n\nThe changes affect assessment dates, lab requirements, and the reading list.`,
  },
  {
    id: 'inbox-2',
    folder: 'inbox',
    sender: 'Admissions Office',
    senderEmail: 'admissions@flexierp.edu',
    to: 'admin@flexierp.edu',
    subject: 'Incoming Freshman Orientation',
    preview: "The schedule for next week's orientation is ready.",
    time: 'Yesterday',
    date: 'Jun 4, 2026, 2:30 PM',
    read: true,
    label: null,
    body: `Hello Administration Team,\n\nThe schedule for next week's incoming freshman orientation has been finalized and approved by the Dean's office. We are expecting approximately 450 new students to attend across the three-day event.\n\nKey highlights that require your attention:\n\n- The opening keynote is scheduled for Monday at 9:00 AM in the Main Auditorium.\n\n- Registration packets are currently being assembled in Room 104.\n\n- We need final confirmation on the departmental breakout room assignments.\n\nLet's schedule a brief 15-minute sync call before the weekend to align on any last-minute logistics.`,
  },
  {
    id: 'inbox-3',
    folder: 'inbox',
    sender: 'Prof. Marcus Johnson',
    senderEmail: 'm.johnson@flexierp.edu',
    to: 'admin@flexierp.edu',
    subject: 'Lab Equipment Requisition',
    preview: 'I have submitted the forms for the new microscope kits.',
    time: 'Mon',
    date: 'Jun 1, 2026, 11:05 AM',
    read: true,
    label: 'Urgent',
    body: `Good morning,\n\nI have submitted the requisition forms for the microscope kits needed by the Biology department. Please confirm whether procurement can process this before practical classes begin.`,
  },
  {
    id: 'sent-1',
    folder: 'sent',
    sender: 'Admin Office',
    senderEmail: 'admin@flexierp.edu',
    to: 'all-staff@flexierp.edu',
    subject: 'Staff Meeting Agenda',
    preview: 'Attached is the agenda for Friday staff meeting.',
    time: 'Today',
    date: 'Jun 5, 2026, 8:10 AM',
    read: true,
    label: 'Faculty',
    body: `Hello Team,\n\nAttached is the agenda for today's staff meeting. Please review the action items before 2:00 PM so we can keep the session focused.`,
  },
  {
    id: 'sent-2',
    folder: 'sent',
    sender: 'Admin Office',
    senderEmail: 'admin@flexierp.edu',
    to: 'parents@flexierp.edu',
    subject: 'Tuition Payment Confirmation',
    preview: 'Thank you for completing your payment.',
    time: 'Wed',
    date: 'Jun 3, 2026, 4:15 PM',
    read: true,
    label: 'Students',
    body: `Dear Parent or Guardian,\n\nThank you for completing your tuition payment. The receipt has been recorded in the student account and is available in the portal.`,
  },
  {
    id: 'draft-1',
    folder: 'drafts',
    sender: 'Draft',
    senderEmail: 'admin@flexierp.edu',
    to: 'faculty@flexierp.edu',
    subject: 'Midterm Supervision Roster',
    preview: 'Please find the proposed supervision schedule below.',
    time: 'Draft',
    date: 'Last edited Jun 5, 2026, 10:22 AM',
    read: true,
    label: 'Faculty',
    body: `Hello Faculty,\n\nPlease find the proposed midterm supervision schedule below. Kindly send corrections before the final roster is published.`,
  },
  {
    id: 'draft-2',
    folder: 'drafts',
    sender: 'Draft',
    senderEmail: 'admin@flexierp.edu',
    to: 'students@flexierp.edu',
    subject: 'Library Access Notice',
    preview: 'The library hours will change during examination week.',
    time: 'Draft',
    date: 'Last edited Jun 4, 2026, 5:40 PM',
    read: true,
    label: 'Students',
    body: `Dear Students,\n\nPlease note that the library hours will change during examination week. The revised schedule will be published after final approval.`,
  },
  ...bulkMessages,
]

const LABELS = ['Urgent', 'Faculty', 'Students']
const labelColors: Record<string, string> = {
  Urgent: '#EF4444',
  Faculty: '#10B981',
  Students: '#3B82F6',
}

const folderItems: { id: FolderId; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'bulk', label: 'Bulk Email', icon: Users },
]

const providerOptions = ['Google Workspace', 'Microsoft 365', 'IMAP / SMTP']

export default function MessagingPage() {
  const [view, setView] = useState<ViewMode>('inbox')
  const [activeMsgId, setActiveMsgId] = useState('inbox-2')
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null)
  const [accountEmail, setAccountEmail] = useState('admin@flexierp.edu')
  const [accountProvider, setAccountProvider] = useState(providerOptions[0])
  const [sentMessages, setSentMessages] = useState<MessageRecord[]>([])
  const [composeDraft, setComposeDraft] = useState<ComposeDraft>({ recipients: '', subject: '', body: '' })

  const allMessages = useMemo(() => [...sentMessages, ...MESSAGES], [sentMessages])

  useEffect(() => {
    const storedAccount = window.localStorage.getItem(CONNECTED_ACCOUNT_KEY)
    if (!storedAccount) return

    try {
      const parsedAccount = JSON.parse(storedAccount) as ConnectedAccount
      setConnectedAccount(parsedAccount)
      setAccountEmail(parsedAccount.email)
      setAccountProvider(parsedAccount.provider)
    } catch {
      window.localStorage.removeItem(CONNECTED_ACCOUNT_KEY)
    }
  }, [])

  const activeFolder = isFolderView(view) ? view : 'inbox'
  const folderCounts = useMemo(() => {
    return folderItems.reduce<Record<FolderId, number>>((counts, item) => {
      counts[item.id] = allMessages.filter((message) => message.folder === item.id).length
      return counts
    }, { inbox: 0, sent: 0, drafts: 0, bulk: 0 })
  }, [allMessages])

  const visibleMessages = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return allMessages.filter((message) => {
      const matchesFolder = message.folder === activeFolder
      const matchesLabel = selectedLabel ? message.label === selectedLabel : true
      const matchesSearch = normalizedSearch
        ? [message.sender, message.senderEmail, message.to, message.subject, message.preview]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        : true

      return matchesFolder && matchesLabel && matchesSearch
    })
  }, [activeFolder, allMessages, searchTerm, selectedLabel])

  const activeMessage = allMessages.find((message) => message.id === activeMsgId) ?? visibleMessages[0] ?? null

  const openFolder = (folder: FolderId) => {
    setView(folder)
    setSelectedLabel(null)
    setActiveMsgId(allMessages.find((message) => message.folder === folder)?.id ?? '')
  }

  const openLabel = (label: string) => {
    const firstMatch = allMessages.find((message) => message.folder === activeFolder && message.label === label)
      ?? allMessages.find((message) => message.label === label)
    setSelectedLabel(label)
    if (firstMatch) {
      setView(firstMatch.folder)
      setActiveMsgId(firstMatch.id)
    }
  }

  const openCompose = (draft: Partial<ComposeDraft> = {}) => {
    setComposeDraft({
      recipients: draft.recipients ?? '',
      subject: draft.subject ?? '',
      body: draft.body ?? '',
    })
    setView('compose')
  }

  const composeBulkMessage = (message: MessageRecord) => {
    openCompose({
      recipients: message.to,
      subject: '',
      body: '',
    })
  }

  const sendComposedMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedRecipients = composeDraft.recipients.trim()
    const trimmedSubject = composeDraft.subject.trim()
    const trimmedBody = composeDraft.body.trim()
    const sentMessage: MessageRecord = {
      id: `sent-${Date.now()}`,
      folder: 'sent',
      sender: 'Admin Office',
      senderEmail: connectedAccount?.email ?? 'admin@flexierp.edu',
      to: trimmedRecipients,
      subject: trimmedSubject || 'No subject',
      preview: trimmedBody || 'Sent message',
      time: 'Just now',
      date: new Date().toLocaleString(),
      read: true,
      label: trimmedRecipients.toLowerCase().includes('teacher') ? 'Faculty' : trimmedRecipients.toLowerCase().includes('parent') ? 'Students' : null,
      body: trimmedBody || 'Sent message',
    }

    setSentMessages((messages) => [sentMessage, ...messages])
    setActiveMsgId(sentMessage.id)
    setSelectedLabel(null)
    setView('sent')
  }

  const connectAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextAccount = { email: accountEmail.trim(), provider: accountProvider }
    setConnectedAccount(nextAccount)
    window.localStorage.setItem(CONNECTED_ACCOUNT_KEY, JSON.stringify(nextAccount))
  }

  const disconnectAccount = () => {
    setConnectedAccount(null)
    window.localStorage.removeItem(CONNECTED_ACCOUNT_KEY)
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden" style={{ fontFamily: '"Palatino Linotype", Palatino, serif' }}>
        <div className="w-56 flex-shrink-0 border-r flex flex-col" style={{ borderColor: '#E4E1D8', background: 'white' }}>
          <div className="p-3 border-b" style={{ borderColor: '#E4E1D8' }}>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: '#E4E1D8', background: '#F7F6F3' }}>
              <Search size={14} style={{ color: '#6B6660' }} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search messages"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={() => openCompose()}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              <Pencil size={14} /> Compose
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {folderItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openFolder(item.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  background: view === item.id ? 'rgba(201,160,32,0.08)' : 'transparent',
                  color: view === item.id ? '#C9A020' : '#0D0D0D',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon size={15} />
                  {item.label}
                </div>
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                  style={{ background: '#C9A020' }}
                >
                  {folderCounts[item.id]}
                </span>
              </button>
            ))}

            <div className="pt-3">
              <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: '#A09080' }}>Labels</p>
              {LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => openLabel(label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
                  style={{
                    background: selectedLabel === label ? `${labelColors[label]}12` : 'transparent',
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: labelColors[label] }} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t" style={{ borderColor: '#E4E1D8' }}>
            <button
              type="button"
              onClick={() => setView('account')}
              className="mb-3 w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: connectedAccount ? '#BBF7D0' : '#E4E1D8', color: connectedAccount ? '#047857' : '#0D0D0D' }}
            >
              <Link2 size={15} />
              {connectedAccount ? 'Email Connected' : 'Connect Email'}
            </button>
            <div className="flex items-center gap-3">
              <Bell size={16} style={{ color: '#6B6660' }} />
              <Mail size={16} style={{ color: connectedAccount ? '#10B981' : '#6B6660' }} />
              <Calendar size={16} style={{ color: '#6B6660' }} />
              <div className="ml-auto flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#C9A020' }}>AD</div>
                <span className="text-sm font-medium">Profile</span>
              </div>
            </div>
          </div>
        </div>

        {view === 'compose' ? (
          <ComposeView
            composeDraft={composeDraft}
            connectedAccount={connectedAccount}
            onDraftChange={setComposeDraft}
            onSend={sendComposedMessage}
          />
        ) : view === 'account' ? (
          <AccountConnectionView
            accountEmail={accountEmail}
            accountProvider={accountProvider}
            connectedAccount={connectedAccount}
            onConnect={connectAccount}
            onDisconnect={disconnectAccount}
            onEmailChange={setAccountEmail}
            onProviderChange={setAccountProvider}
          />
        ) : (
          <>
            <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: '#E4E1D8', background: '#F7F6F3' }}>
              <div className="flex items-center justify-between px-4 py-3.5 border-b bg-white" style={{ borderColor: '#E4E1D8' }}>
                <div>
                  <h2 className="font-bold">{folderItems.find((item) => item.id === activeFolder)?.label}</h2>
                  {selectedLabel && <p className="text-xs mt-0.5" style={{ color: '#6B6660' }}>Filtered by {selectedLabel}</p>}
                </div>
                {selectedLabel && (
                  <button type="button" onClick={() => setSelectedLabel(null)} className="text-xs font-semibold" style={{ color: '#C9A020' }}>
                    Clear
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {visibleMessages.length > 0 ? (
                  visibleMessages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => {
                        if (message.folder === 'bulk') {
                          composeBulkMessage(message)
                          return
                        }
                        setActiveMsgId(message.id)
                      }}
                      className="w-full text-left px-4 py-3.5 border-b cursor-pointer transition-colors hover:bg-white"
                      style={{
                        borderColor: '#E4E1D8',
                        background: message.id === activeMessage?.id ? 'white' : 'transparent',
                        borderLeft: message.id === activeMessage?.id ? '3px solid #C9A020' : '3px solid transparent',
                      }}
                    >
                      <div className="flex justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{message.sender}</p>
                        <span className="text-xs flex-shrink-0 ml-2" style={{ color: message.read ? '#A09080' : '#C9A020' }}>{message.time}</span>
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: '#0D0D0D' }}>{message.subject}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#6B6660' }}>{message.preview}</p>
                      {message.label && (
                        <div className="mt-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${labelColors[message.label]}18`, color: labelColors[message.label] }}>
                            {message.label}
                          </span>
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-5 text-sm" style={{ color: '#6B6660' }}>No messages found.</div>
                )}
              </div>
            </div>

            <MessageDetail message={activeMessage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}

function isFolderView(view: ViewMode): view is FolderId {
  return view === 'inbox' || view === 'sent' || view === 'drafts' || view === 'bulk'
}

function MessageDetail({ message }: { message: MessageRecord | null }) {
  if (!message) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white min-w-0">
        <p className="text-sm" style={{ color: '#6B6660' }}>Select a message to preview it.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: '#E4E1D8' }}>
        <button type="button" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Delete message"><Trash2 size={15} style={{ color: '#6B6660' }} /></button>
        <button type="button" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Mark done"><CheckCircle size={15} style={{ color: '#6B6660' }} /></button>
        <button type="button" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Assign contact"><User size={15} style={{ color: '#6B6660' }} /></button>
        <button type="button" className="btn-outline text-sm px-4 py-1.5 flex items-center gap-1.5">
          <Reply size={14} /> Reply
        </button>
        <button type="button" className="btn-outline text-sm px-4 py-1.5 flex items-center gap-1.5">
          <Forward size={14} /> Forward
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-5">{message.subject}</h1>
        <div className="flex items-start gap-3 mb-6 pb-5 border-b" style={{ borderColor: '#E4E1D8' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: '#C9A020' }}>
            {getInitials(message.sender)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{message.sender}</p>
            <p className="text-sm truncate" style={{ color: '#6B6660' }}>&lt;{message.senderEmail}&gt;</p>
            <p className="text-sm truncate" style={{ color: '#6B6660' }}>To: {message.to}</p>
          </div>
          <span className="text-sm flex-shrink-0" style={{ color: '#A09080' }}>{message.date}</span>
        </div>
        <div className="prose prose-sm max-w-none">
          {message.body.split('\n').map((line, index) => (
            <p
              key={`${message.id}-${index}`}
              className={`text-sm leading-relaxed ${line === '' ? 'h-2' : ''}`}
              style={{ color: line.startsWith('-') ? '#0D0D0D' : '#374151' }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComposeView({
  composeDraft,
  connectedAccount,
  onDraftChange,
  onSend,
}: {
  composeDraft: ComposeDraft
  connectedAccount: ConnectedAccount | null
  onDraftChange: (draft: ComposeDraft) => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      <div className="px-6 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
        <h2 className="text-xl font-bold">Compose Message</h2>
        <p className="mt-1 text-sm" style={{ color: '#6B6660' }}>
          Sending from {connectedAccount?.email ?? 'admin@flexierp.edu'}
        </p>
      </div>
      <form onSubmit={onSend} className="flex-1 flex flex-col p-6 gap-4">
        <input
          required
          className="input"
          placeholder="Recipients"
          value={composeDraft.recipients}
          onChange={(event) => onDraftChange({ ...composeDraft, recipients: event.target.value })}
        />
        <input
          className="input"
          placeholder="Subject"
          value={composeDraft.subject}
          onChange={(event) => onDraftChange({ ...composeDraft, subject: event.target.value })}
        />
        <textarea
          className="input flex-1 min-h-72 resize-none py-3"
          placeholder="Write your message"
          value={composeDraft.body}
          onChange={(event) => onDraftChange({ ...composeDraft, body: event.target.value })}
        />
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-outline px-4 py-2 text-sm">Save Draft</button>
          <button type="submit" className="btn-gold px-5 py-2 text-sm">Send</button>
        </div>
      </form>
    </div>
  )
}

function AccountConnectionView({
  accountEmail,
  accountProvider,
  connectedAccount,
  onConnect,
  onDisconnect,
  onEmailChange,
  onProviderChange,
}: {
  accountEmail: string
  accountProvider: string
  connectedAccount: ConnectedAccount | null
  onConnect: (event: FormEvent<HTMLFormElement>) => void
  onDisconnect: () => void
  onEmailChange: (email: string) => void
  onProviderChange: (provider: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-white min-w-0">
      <div className="px-6 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
        <h2 className="text-xl font-bold">Email Account</h2>
        <p className="mt-1 text-sm" style={{ color: '#6B6660' }}>Connect the school email used for inbox sync and outgoing messages.</p>
      </div>

      <div className="max-w-2xl p-6">
        {connectedAccount && (
          <div className="mb-5 rounded-lg border p-4" style={{ borderColor: '#BBF7D0', background: '#ECFDF5' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#047857' }}>Connected</p>
                <p className="mt-1 font-semibold">{connectedAccount.email}</p>
                <p className="text-sm" style={{ color: '#065F46' }}>{connectedAccount.provider}</p>
              </div>
              <button type="button" onClick={onDisconnect} className="btn-outline px-3 py-1.5 text-sm">Disconnect</button>
            </div>
          </div>
        )}

        <form onSubmit={onConnect} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email address</label>
            <input
              required
              type="email"
              value={accountEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              className="input"
              placeholder="admin@school.edu"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Provider</label>
            <select value={accountProvider} onChange={(event) => onProviderChange(event.target.value)} className="input">
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border p-4 text-sm" style={{ borderColor: '#E4E1D8', background: '#F7F6F3', color: '#6B6660' }}>
            OAuth or SMTP credentials can be connected to this screen when backend mail routes are available. For now, the portal remembers the selected account locally and uses it as the sending identity in Messaging.
          </div>

          <button type="submit" className="btn-gold inline-flex items-center gap-2 px-5 py-2">
            <Link2 size={15} /> {connectedAccount ? 'Update Account' : 'Connect Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
