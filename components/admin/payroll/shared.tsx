import type { PayrollPayment, Staff } from '@/types/payroll'
import { formatCurrency } from '@/lib/utils'
import { Banknote, CalendarDays, CreditCard, FileText, History } from 'lucide-react'

export const ADMIN_EMAIL = 'admin@edumanage.edu'
export const PAYROLL_PAYSLIPS_STORAGE_KEY = 'edumanage.payroll.payslips'
export const PAYROLL_PAYMENTS_STORAGE_KEY = 'edumanage.payroll.payments'

export const currency = (amount: number) => formatCurrency(amount, 'NGN')

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
