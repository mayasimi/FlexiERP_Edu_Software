import type { PayrollPayment, Staff } from '@/types/payroll'
import { formatCurrency } from '@/lib/utils'
import { Banknote, CalendarDays, CreditCard, FileText, History } from 'lucide-react'

export const ADMIN_EMAIL = 'admin@edumanage.edu'
export const PAYROLL_PAYSLIPS_STORAGE_KEY = 'edumanage.payroll.payslips'
export const PAYROLL_PAYMENTS_STORAGE_KEY = 'edumanage.payroll.payments'

export const currency = (amount: number) => formatCurrency(amount, 'NGN')

function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source)
  Array.from(computed).forEach((property) => {
    target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property))
  })

  Array.from(source.children).forEach((child, index) => {
    const targetChild = target.children[index]
    if (child instanceof HTMLElement && targetChild instanceof HTMLElement) {
      copyComputedStyles(child, targetChild)
    }
  })
}

async function inlineImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    const src = image.getAttribute('src')
    if (!src || src.startsWith('data:')) return

    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      image.setAttribute('src', dataUrl)
    } catch {
      image.remove()
    }
  }))
}

function imageDataToPdf(imageDataUrl: string, width: number, height: number) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 28
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2
  const scale = Math.min(maxWidth / width, maxHeight / height)
  const imageWidth = width * scale
  const imageHeight = height * scale
  const x = (pageWidth - imageWidth) / 2
  const y = (pageHeight - imageHeight) / 2
  const imageBinary = atob(imageDataUrl.split(',')[1] || '')
  const parts: string[] = []
  const offsets: number[] = []
  const add = (value: string) => {
    offsets.push(parts.join('').length)
    parts.push(value)
  }

  parts.push('%PDF-1.4\n')
  add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBinary.length} >>\nstream\n${imageBinary}\nendstream\nendobj\n`)

  const content = `q\n${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im1 Do\nQ\n`
  add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

  const xrefOffset = parts.join('').length
  parts.push(`xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`)
  parts.push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  const pdf = parts.join('')
  const bytes = new Uint8Array(pdf.length)
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index)
  }
  return new Blob([bytes], { type: 'application/pdf' })
}

export async function downloadElementAsPdf(element: HTMLElement | null, filename: string) {
  if (!element || typeof window === 'undefined') return

  const clone = element.cloneNode(true) as HTMLElement
  copyComputedStyles(element, clone)
  clone.querySelectorAll('[data-pdf-export-hidden="true"]').forEach((node) => node.remove())
  clone.style.width = `${element.offsetWidth}px`
  clone.style.maxHeight = 'none'
  clone.style.overflow = 'visible'
  await inlineImages(clone)

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.background = '#FFFFFF'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    const rect = clone.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 2, 3)
    const serialized = new XMLSerializer().serializeToString(clone)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
        </foreignObject>
      </svg>
    `
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(rect.width * scale)
    canvas.height = Math.ceil(rect.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pdf = imageDataToPdf(canvas.toDataURL('image/jpeg', 0.95), canvas.width, canvas.height)
    const url = window.URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => window.URL.revokeObjectURL(url), 500)
  } finally {
    wrapper.remove()
  }
}

export type PayrollPage = 'dashboard' | 'generate' | 'payslips' | 'payments'
export type PayslipStatus = 'Generated' | 'Paid' | 'Sent'

export interface PayslipRecord {
  id: string
  employeeId: string
  employeeName: string
  payPeriod: string
  paymentDate: string
  basicSalary: number
  allowances: number
  bonus: number
  overtime: number
  deductions: number
  tax: number
  pension: number
  netSalary: number
  generatedDate: string
  status: PayslipStatus
}

export function payslipPdfFilename(payslip: PayslipRecord) {
  return `payslip-${payslip.employeeId}-${payslip.payPeriod.replace(/\s+/g, '-')}.pdf`
}

export function PayslipDocument({ payslip, role = 'Staff' }: { payslip: PayslipRecord; role?: string }) {
  const totalEarnings = payslip.basicSalary + payslip.allowances + payslip.bonus + payslip.overtime
  const totalDeductions = payslip.deductions + payslip.tax + payslip.pension

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: '#E4E1D8' }}>
      <div className="flex items-start justify-between gap-4 p-6 text-white" style={{ background: '#0D0D0D' }}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
            <img src="/FLEXI_LOGO.png" alt="School logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: '#C9A020' }}>Official Payslip</p>
            <h3 className="mt-1 text-2xl font-bold">FlexiERP Edu School</h3>
            <p className="mt-1 text-sm opacity-75">{payslip.payPeriod}</p>
          </div>
        </div>
        <div className="text-right text-xs opacity-80">
          <p>Slip No: <strong>{payslip.id}</strong></p>
          <p className="mt-1">Generated: {payslip.generatedDate}</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PayslipPreviewTile label="Employee" value={payslip.employeeName} />
          <PayslipPreviewTile label="Role" value={role} />
          <PayslipPreviewTile label="Payment Date" value={payslip.paymentDate} />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
            <h4 className="mb-3 font-bold">Earnings</h4>
            <PayslipPreviewLine label="Basic Salary" value={payslip.basicSalary} />
            <PayslipPreviewLine label="Allowances" value={payslip.allowances} />
            <PayslipPreviewLine label="Bonus" value={payslip.bonus} />
            <PayslipPreviewLine label="Overtime Pay" value={payslip.overtime} />
            <PayslipPreviewLine label="Total Earnings" value={totalEarnings} strong positive />
          </div>

          <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
            <h4 className="mb-3 font-bold">Deductions</h4>
            <PayslipPreviewLine label="Other Deductions" value={payslip.deductions} negative />
            <PayslipPreviewLine label="Tax (PAYE)" value={payslip.tax} negative />
            <PayslipPreviewLine label="Pension" value={payslip.pension} negative />
            <PayslipPreviewLine label="Total Deductions" value={totalDeductions} strong negative />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46' }}>Net Salary</p>
            <p className="mt-1 text-3xl font-bold" style={{ color: '#10B981' }}>{currency(payslip.netSalary)}</p>
          </div>
          <div className="text-sm md:text-right" style={{ color: '#065F46' }}>
            <p>Employee ID: {payslip.employeeId}</p>
            <p>Status: {payslip.status}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayslipPreviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B6660' }}>{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  )
}

function PayslipPreviewLine({ label, negative = false, positive = false, strong = false, value }: { label: string; negative?: boolean; positive?: boolean; strong?: boolean; value: number }) {
  return (
    <div className={`flex justify-between gap-3 py-2 ${strong ? 'mt-2 border-t font-bold' : ''}`} style={{ borderColor: '#E4E1D8' }}>
      <span style={{ color: strong ? '#0D0D0D' : '#6B6660' }}>{label}</span>
      <span style={{ color: positive ? '#10B981' : negative ? '#EF4444' : '#0D0D0D' }}>{negative && value > 0 ? '-' : ''}{currency(value)}</span>
    </div>
  )
}

export interface PaymentRecord {
  id: string
  employeeId: string
  employeeName: string
  payPeriod: string
  paymentDate: string
  method: string
  amount: number
  status: 'Completed' | 'Pending'
  reference: string
}

export type PayslipForm = {
  employeeId: string
  payPeriod: string
  paymentDate: string
  allowances: string
  bonus: string
  overtime: string
  deductions: string
  tax: string
  pension: string
}

export const INITIAL_STAFF: Staff[] = [
  { id: 'STF-001', name: 'Dr. Sarah Jenkins', role: 'Head of Mathematics', basePay: 6200, currentPay: 6200, paid: true, bankName: 'First National Bank', accountNumber: '**** 4211' },
  { id: 'STF-002', name: 'Prof. Robert Chen', role: 'Senior Lecturer', basePay: 5400, currentPay: 5650, paid: false, bankName: 'Cedar Trust Bank', accountNumber: '**** 8934' },
  { id: 'STF-003', name: 'Elena Rostova', role: 'Academic Coordinator', basePay: 4900, currentPay: 4750, paid: false, bankName: 'Metro Credit Union', accountNumber: '**** 1765' },
  { id: 'STF-004', name: 'David Kim', role: 'Adjunct Professor', basePay: 3800, currentPay: 3800, paid: true, bankName: 'Union Finance', accountNumber: '**** 0288' },
  { id: 'STF-005', name: 'Prof. Alan Smith', role: 'Senior Lecturer', basePay: 5200, currentPay: 5300, paid: false, bankName: 'Heritage Bank', accountNumber: '**** 6420' },
  { id: 'STF-006', name: 'Dr. Maria Santos', role: 'Lab Instructor', basePay: 4100, currentPay: 4100, paid: true, bankName: 'Sterling Campus Bank', accountNumber: '**** 3091' },
]

export const INITIAL_PAYSLIPS: PayslipRecord[] = [
  { id: 'PSL-001', employeeId: 'STF-001', employeeName: 'Dr. Sarah Jenkins', payPeriod: 'May 2026', paymentDate: '2026-05-20', basicSalary: 6200, allowances: 0, bonus: 0, overtime: 0, deductions: 0, tax: 0, pension: 0, netSalary: 6200, generatedDate: '2026-05-15', status: 'Paid' },
  { id: 'PSL-002', employeeId: 'STF-002', employeeName: 'Prof. Robert Chen', payPeriod: 'May 2026', paymentDate: '2026-05-20', basicSalary: 5400, allowances: 250, bonus: 0, overtime: 0, deductions: 0, tax: 0, pension: 0, netSalary: 5650, generatedDate: '2026-05-15', status: 'Generated' },
]

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  { id: 'PAY-001', employeeId: 'STF-001', employeeName: 'Dr. Sarah Jenkins', payPeriod: 'May 2026', paymentDate: '2026-05-20', method: 'Paystack', amount: 6200, status: 'Completed', reference: 'REF-SAR-001' },
  { id: 'PAY-002', employeeId: 'STF-004', employeeName: 'David Kim', payPeriod: 'April 2026', paymentDate: '2026-04-25', method: 'Bank Transfer', amount: 3800, status: 'Completed', reference: 'REF-DAV-004' },
]

export const pageLabels: Record<PayrollPage, string> = {
  dashboard: 'Payroll Dashboard',
  generate: 'Generate Payslip',
  payslips: 'Payslip History',
  payments: 'Payment History',
}

export const navigationItems: Array<{ page: PayrollPage; label: string; icon: typeof FileText }> = [
  { page: 'dashboard', label: 'Payroll Dashboard', icon: Banknote },
  { page: 'generate', label: 'Generate Payslip', icon: FileText },
  { page: 'payslips', label: 'Payslip History', icon: History },
  { page: 'payments', label: 'Payment History', icon: CreditCard },
]

export function monthLabel(value: string) {
  if (!value) return 'May 2026'
  const [year, month] = value.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function readStoredRecords<T>(key: string, fallback: T[]) {
  if (typeof window === 'undefined') return fallback

  try {
    const value = window.localStorage.getItem(key)
    if (!value) return fallback
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : fallback
  } catch {
    return fallback
  }
}

export function makePayrollPayment(members: Staff[]): PayrollPayment {
  const amount = members.reduce((total, member) => total + member.currentPay, 0)

  return members.length === 1
    ? {
        staffId: members[0].id,
        staffName: members[0].name,
        role: members[0].role,
        amount,
        bankName: members[0].bankName,
        accountNumber: members[0].accountNumber,
      }
    : {
        staffId: `BULK-${members.length}`,
        staffName: `${members.length} Staff Members`,
        role: 'Bulk Payroll Run',
        amount,
        bankName: 'Multiple Banks',
        accountNumber: 'Batch payroll',
      }
}

export function SummaryCard({
  border,
  icon,
  label,
  note,
  noteColor = '#6B6660',
  value,
}: {
  border: string
  icon: React.ReactNode
  label: string
  note: string
  noteColor?: string
  value: React.ReactNode
}) {
  return (
    <div className="stat-card transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderBottom: `3px solid ${border}` }}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <p className="text-xs" style={{ color: noteColor }}>{note}</p>
    </div>
  )
}

export function HistoryTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
