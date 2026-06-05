import { mockDatabase } from '@/lib/mock-database'

export type SenderRole = 'school_admin' | 'support'
export type WeeklyAttendanceStatus = 'present' | 'absent'

export interface ChatMessage {
  id: string
  chat_id: string
  sender_role: SenderRole
  body: string
  read_at: string | null
  created_at: string
}

export interface Chat {
  id: string
  school_id: string
  subject: string
  status: 'open' | 'closed'
  last_message_at: string
  unread_count: number
}

export interface PayrollPaymentReference {
  id: string
  reference: string
  amount: number
  currency: 'NGN'
  status: 'pending' | 'successful' | 'failed'
  authorization_url: string
  provider: 'paystack'
  staff_ids: string[]
  created_at: string
  verified_at: string | null
}

export interface PayrollTaxRecord {
  id: string
  staff_id: string
  gross_pay: number
  pension: number
  relief: number
  taxable_income: number
  tax_amount: number
  firs_reference: string
  breakdown: Array<{ band: string; rate: number; taxable: number; tax: number }>
  created_at: string
}

export interface WeeklyAttendanceRecord {
  id: string
  student_id: string
  class_id: string
  week_start_date: string
  week_end_date: string
  status: WeeklyAttendanceStatus
  teacher_notes: string
  updated_at: string
}

const nowIso = () => new Date().toISOString()
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const chats: Chat[] = [
  {
    id: 'chat-gwpl-001',
    school_id: 'school-demo',
    subject: 'GWPL Technical Support',
    status: 'open',
    last_message_at: '2026-06-04T08:30:00.000Z',
    unread_count: 1,
  },
]

const chatMessages: ChatMessage[] = [
  {
    id: 'chat-msg-001',
    chat_id: 'chat-gwpl-001',
    sender_role: 'support',
    body: 'Hello, GWPL support is online. Send us any technical issue and we will respond here.',
    read_at: null,
    created_at: '2026-06-04T08:30:00.000Z',
  },
]

const payrollReferences: PayrollPaymentReference[] = [
  {
    id: 'payref-001',
    reference: 'PAYROLL-DEMO-20260604',
    amount: 620000,
    currency: 'NGN',
    status: 'successful',
    authorization_url: 'https://checkout.paystack.com/demo-payroll-reference',
    provider: 'paystack',
    staff_ids: ['staff-001'],
    created_at: '2026-06-04T08:00:00.000Z',
    verified_at: '2026-06-04T08:10:00.000Z',
  },
]

const taxRecords: PayrollTaxRecord[] = []

const weeklyAttendance: WeeklyAttendanceRecord[] = mockDatabase.students.map((student, index) => {
  const section = mockDatabase.sections.find((item) => item.id === student.section_id)
  return {
    id: `weekly-att-${index + 1}`,
    student_id: student.id,
    class_id: section?.class_id || 'class-ss2',
    week_start_date: '2026-06-01',
    week_end_date: '2026-06-07',
    status: index === 1 ? 'absent' : 'present',
    teacher_notes: index === 1 ? 'Parent notified for follow-up.' : '',
    updated_at: nowIso(),
  }
})

export function listChats() {
  return chats.map((chat) => ({
    ...chat,
    unread_count: chatMessages.filter((message) => message.chat_id === chat.id && message.sender_role === 'support' && !message.read_at).length,
  }))
}

export function getChatMessages(chatId: string, markRead = false) {
  const chat = chats.find((item) => item.id === chatId)
  if (!chat) return null

  if (markRead) {
    const readAt = nowIso()
    chatMessages.forEach((message) => {
      if (message.chat_id === chatId && message.sender_role === 'support' && !message.read_at) {
        message.read_at = readAt
      }
    })
  }

  return chatMessages
    .filter((message) => message.chat_id === chatId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function sendChatMessage(chatId: string, body: string, senderRole: SenderRole = 'school_admin') {
  const chat = chats.find((item) => item.id === chatId)
  if (!chat) return null

  const timestamp = nowIso()
  const message: ChatMessage = {
    id: makeId('chat-msg'),
    chat_id: chatId,
    sender_role: senderRole,
    body: body.trim(),
    read_at: senderRole === 'school_admin' ? timestamp : null,
    created_at: timestamp,
  }

  chatMessages.push(message)
  chat.last_message_at = timestamp
  return message
}

export function initiatePayrollPayment(input: { amount: number; staff_ids?: string[]; payroll_period_id?: string }) {
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('A valid payroll amount is required.')
  }

  const reference = `PAYROLL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const record: PayrollPaymentReference = {
    id: makeId('payref'),
    reference,
    amount,
    currency: 'NGN',
    status: 'pending',
    authorization_url: `https://checkout.paystack.com/${reference.toLowerCase()}`,
    provider: 'paystack',
    staff_ids: input.staff_ids || [],
    created_at: nowIso(),
    verified_at: null,
  }

  payrollReferences.unshift(record)
  return record
}

export function verifyPayrollPayment(reference: string) {
  const record = payrollReferences.find((item) => item.reference === reference)
  if (!record) return null

  if (record.status === 'pending') {
    record.status = 'successful'
    record.verified_at = nowIso()
  }

  return record
}

export function calculateTax(input: { staff_id: string; gross_pay: number; pension?: number; relief?: number }) {
  const grossPay = Number(input.gross_pay)
  if (!input.staff_id || !Number.isFinite(grossPay) || grossPay <= 0) {
    throw new Error('staff_id and a valid gross_pay are required.')
  }

  const pension = Math.max(0, Number(input.pension || 0))
  const relief = Math.max(0, Number(input.relief || grossPay * 0.2 + 200000 / 12))
  let remaining = Math.max(0, grossPay - pension - relief)

  const bands = [
    { band: 'First 300,000 annualized', monthlyLimit: 300000 / 12, rate: 0.07 },
    { band: 'Next 300,000 annualized', monthlyLimit: 300000 / 12, rate: 0.11 },
    { band: 'Next 500,000 annualized', monthlyLimit: 500000 / 12, rate: 0.15 },
    { band: 'Next 500,000 annualized', monthlyLimit: 500000 / 12, rate: 0.19 },
    { band: 'Next 1,600,000 annualized', monthlyLimit: 1600000 / 12, rate: 0.21 },
    { band: 'Above 3,200,000 annualized', monthlyLimit: Number.POSITIVE_INFINITY, rate: 0.24 },
  ]

  const breakdown = bands.map((band) => {
    const taxable = Math.max(0, Math.min(remaining, band.monthlyLimit))
    remaining -= taxable
    return {
      band: band.band,
      rate: band.rate,
      taxable: Math.round(taxable * 100) / 100,
      tax: Math.round(taxable * band.rate * 100) / 100,
    }
  }).filter((item) => item.tax > 0)

  const record: PayrollTaxRecord = {
    id: makeId('tax'),
    staff_id: input.staff_id,
    gross_pay: grossPay,
    pension,
    relief: Math.round(relief * 100) / 100,
    taxable_income: Math.round(Math.max(0, grossPay - pension - relief) * 100) / 100,
    tax_amount: Math.round(breakdown.reduce((sum, item) => sum + item.tax, 0) * 100) / 100,
    firs_reference: `FIRS-${Date.now()}`,
    breakdown,
    created_at: nowIso(),
  }

  taxRecords.unshift(record)
  return record
}

export function searchSchemeOfWork(filters: { subject?: string; term?: string; className?: string }) {
  const subject = filters.subject?.trim().toLowerCase()
  const term = filters.term?.trim().toLowerCase()
  const className = filters.className?.trim().toLowerCase()

  return mockDatabase.scheme_weeks.flatMap((week) => {
    const termInfo = mockDatabase.academic_terms.find((item) => item.id === week.term_id)
    const section = mockDatabase.sections.find((item) => item.id === week.section_id)
    const classInfo = mockDatabase.classes.find((item) => item.id === section?.class_id)

    if (term && !termInfo?.name.toLowerCase().includes(term)) return []
    if (className && !classInfo?.name.toLowerCase().includes(className)) return []

    return mockDatabase.scheme_topics
      .filter((topic) => topic.scheme_week_id === week.id)
      .map((topic) => {
        const subjectInfo = mockDatabase.subjects.find((item) => item.id === topic.subject_id)
        const teacher = mockDatabase.staff.find((item) => item.id === topic.staff_id)
        return {
          id: topic.id,
          week: week.title,
          week_no: week.week_no,
          theme: week.theme,
          subject: subjectInfo?.name || 'Unknown subject',
          class: classInfo?.name || 'Unknown class',
          term: termInfo?.name || 'Unknown term',
          topic: topic.topic,
          objective: topic.objective,
          activity: topic.activity,
          resources: topic.resources,
          assessment: topic.assessment,
          homework: topic.homework,
          teacher: teacher?.name || 'Unassigned',
        }
      })
      .filter((topic) => !subject || topic.subject.toLowerCase().includes(subject))
  })
}

export function upsertWeeklyAttendance(input: {
  class_id: string
  week_start_date: string
  week_end_date: string
  records: Array<{ student_id: string; status: WeeklyAttendanceStatus; teacher_notes?: string }>
}) {
  if (!input.class_id || !input.week_start_date || !input.week_end_date || !Array.isArray(input.records)) {
    throw new Error('class_id, week_start_date, week_end_date, and records are required.')
  }

  const updated = input.records.map((record) => {
    const existing = weeklyAttendance.find((item) =>
      item.student_id === record.student_id &&
      item.class_id === input.class_id &&
      item.week_start_date === input.week_start_date
    )

    if (existing) {
      existing.status = record.status
      existing.teacher_notes = record.teacher_notes || ''
      existing.week_end_date = input.week_end_date
      existing.updated_at = nowIso()
      return existing
    }

    const created: WeeklyAttendanceRecord = {
      id: makeId('weekly-att'),
      student_id: record.student_id,
      class_id: input.class_id,
      week_start_date: input.week_start_date,
      week_end_date: input.week_end_date,
      status: record.status,
      teacher_notes: record.teacher_notes || '',
      updated_at: nowIso(),
    }
    weeklyAttendance.push(created)
    return created
  })

  return updated
}

export function getWeeklyAttendance(classId: string, weekStart: string) {
  const records = weeklyAttendance.filter((item) => item.class_id === classId && item.week_start_date === weekStart)
  return records.map((record) => ({
    ...record,
    student: mockDatabase.students.find((student) => student.id === record.student_id),
  }))
}

export function getReceipt(paymentId: string) {
  const payment = mockDatabase.fee_payments.find((item) => item.id === paymentId || item.reference === paymentId)
  if (!payment) return null

  const student = mockDatabase.students.find((item) => item.id === payment.student_id)
  const invoice = mockDatabase.invoices.find((item) => item.id === payment.invoice_id)
  const term = mockDatabase.academic_terms.find((item) => item.id === invoice?.term_id)

  return {
    payment,
    student_name: student?.name || 'Unknown student',
    amount: payment.amount,
    date: payment.paid_at,
    payment_reference: payment.reference,
    school_name: 'FlexiERP Demo School',
    term: term?.name || 'Current Term',
  }
}

export function createPdfReceipt(receipt: NonNullable<ReturnType<typeof getReceipt>>) {
  const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const lines = [
    receipt.school_name,
    'Official Payment Receipt',
    `Student: ${receipt.student_name}`,
    `Amount: NGN ${receipt.amount.toLocaleString()}`,
    `Date: ${new Date(receipt.date).toLocaleDateString('en-NG')}`,
    `Reference: ${receipt.payment_reference}`,
    `Term: ${receipt.term}`,
  ]

  const text = lines.map((line, index) => `BT /F1 14 Tf 72 ${740 - index * 28} Td (${escapePdf(line)}) Tj ET`).join('\n')
  const stream = `${text}\n`
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj`,
  ]
  const body = objects.join('\n')
  return `%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF`
}
