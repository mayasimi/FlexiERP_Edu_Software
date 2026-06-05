'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, CalendarDays, CreditCard, Download, Eye, FileText, ReceiptText } from 'lucide-react'
import { payrollApi } from '@/lib/api'
import { useAuthStoreMounted } from '@/lib/auth-store'

const PAYROLL_PAYSLIPS_STORAGE_KEY = 'edumanage.payroll.payslips'
const PAYROLL_PAYMENTS_STORAGE_KEY = 'edumanage.payroll.payments'

type PayslipStatus = 'Generated' | 'Paid' | 'Sent'

interface PayslipRecord {
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

interface PaymentRecord {
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

const FALLBACK_PAYSLIPS: PayslipRecord[] = [
  {
    id: 'PSL-001',
    employeeId: 'STF-001',
    employeeName: 'Dr. Sarah Jenkins',
    payPeriod: 'May 2026',
    paymentDate: '2026-05-20',
    basicSalary: 6200,
    allowances: 0,
    bonus: 0,
    overtime: 0,
    deductions: 0,
    tax: 0,
    pension: 0,
    netSalary: 6200,
    generatedDate: '2026-05-15',
    status: 'Paid',
  },
]

const FALLBACK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'PAY-001',
    employeeId: 'STF-001',
    employeeName: 'Dr. Sarah Jenkins',
    payPeriod: 'May 2026',
    paymentDate: '2026-05-20',
    method: 'Paystack',
    amount: 6200,
    status: 'Completed',
    reference: 'REF-SAR-001',
  },
]

function currency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    currency: 'NGN',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)
}

export default function PayrollSection() {
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null)
  const [dateQuery,         setDateQuery]         = useState('')
  const [monthQuery,        setMonthQuery]        = useState('')

  // ── Fetch real payroll data from backend ──────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-my-payslips'],
    queryFn:  () => payrollApi.getMyPayslips().then(r => r.data),
  })

  const payslips: PayslipRecord[] = data?.payslips ?? []
  const payments: PaymentRecord[] = data?.payments ?? []

  // ── Filter by date / month queries ────────────────────────────────────────
  const visiblePayslips = useMemo(() => {
    const normalizedMonth = monthQuery
      ? new Date(`${monthQuery}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase()
      : ''
    return payslips.filter(item => {
      const matchesDate  = !dateQuery   || item.generatedDate === dateQuery || item.paymentDate === dateQuery
      const matchesMonth = !normalizedMonth || item.payPeriod.toLowerCase() === normalizedMonth
      return matchesDate && matchesMonth
    })
  }, [dateQuery, monthQuery, payslips])

  const visiblePayments = useMemo(() => {
    const normalizedMonth = monthQuery
      ? new Date(`${monthQuery}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase()
      : ''
    return payments.filter(item => {
      const matchesDate  = !dateQuery   || item.paymentDate === dateQuery
      const matchesMonth = !normalizedMonth || item.payPeriod.toLowerCase() === normalizedMonth
      return matchesDate && matchesMonth
    })
  }, [dateQuery, monthQuery, payments])

  const selectedPayslip = visiblePayslips.find(item => item.id === selectedPayslipId) ?? visiblePayslips[0]
  const totalPaid       = visiblePayments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">My Payroll</h1>
        <p className="page-subtitle">View generated payslips and payment history from the payroll office.</p>
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* Staff summary card */}
        {data?.staff && (
          <div className="card animate-in" style={{ borderLeft: '4px solid #C9A020' }}>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Employee</p>
                <p className="font-bold text-base mt-1">{data.staff.name}</p>
                <p className="text-sm" style={{ color: '#6B6660' }}>{data.staff.role} · {data.staff.department}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Bank</p>
                <p className="font-bold text-base mt-1">{data.staff.bank_name}</p>
                <p className="text-sm" style={{ color: '#6B6660' }}>{data.staff.account_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Net Monthly Salary</p>
                <p className="font-bold text-base mt-1" style={{ color: '#10B981' }}>{currency(data.staff.net_salary)}</p>
                <p className="text-sm" style={{ color: '#6B6660' }}>After tax & pension</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in stagger-1">
          <StatCard icon={<ReceiptText size={18} />} label="Payslips"    value={visiblePayslips.length} note="Generated documents"    color="#C9A020" />
          <StatCard icon={<CreditCard  size={18} />} label="Payments"   value={visiblePayments.length} note="Completed records"      color="#10B981" />
          <StatCard icon={<Banknote    size={18} />} label="Total Paid" value={currency(totalPaid)}    note="Across payment history" color="#0D0D0D" />
        </div>

        {/* Filters */}
        <div className="card animate-in stagger-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-base">Find Payment Slip</h2>
              <p className="text-xs mt-1" style={{ color: '#6B6660' }}>
                Enter a generated/payment date or pay period to bring up matching slips.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] lg:min-w-[520px]">
              <div className="relative">
                <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={dateQuery} onChange={e => setDateQuery(e.target.value)}
                  type="date" className="input pl-9" aria-label="Find payslip by date" />
              </div>
              <input value={monthQuery} onChange={e => setMonthQuery(e.target.value)}
                type="month" className="input" aria-label="Find payslip by pay period" />
              <button type="button" onClick={() => { setDateQuery(''); setMonthQuery('') }} className="btn-outline">
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Payslips + Detail */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card animate-in stagger-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-lg">Payment Slips</h2>
                <p className="text-xs mt-1" style={{ color: '#6B6660' }}>
                  Last 6 months of payslips from the payroll office.
                </p>
              </div>
            </div>

            {isLoading && <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading payslips...</p>}

            {!isLoading && visiblePayslips.length > 0 ? (
              <div className="space-y-3">
                {visiblePayslips.map(payslip => {
                  const active = selectedPayslip?.id === payslip.id
                  return (
                    <button key={payslip.id} type="button"
                      onClick={() => setSelectedPayslipId(payslip.id)}
                      className="w-full rounded-xl p-4 text-left transition-all"
                      style={{ background: active ? 'rgba(201,160,32,0.08)' : '#FFFFFF', border: `1px solid ${active ? 'rgba(201,160,32,0.45)' : '#E4E1D8'}` }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{payslip.id} / {payslip.payPeriod}</p>
                          <p className="text-xs mt-1" style={{ color: '#6B6660' }}>
                            Generated {payslip.generatedDate} / Payment date {payslip.paymentDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: '#10B981' }}>{currency(payslip.netSalary)}</p>
                          <span className={`badge ${payslip.status === 'Paid' ? 'badge-green' : 'badge-gold'}`}>
                            {payslip.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              !isLoading && <EmptyState title="No payslips yet" text="Payslips generated by admin will show here." />
            )}
          </div>

          <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-lg">Slip Details</h2>
              {selectedPayslip && <FileText size={18} style={{ color: '#C9A020' }} />}
            </div>
            {selectedPayslip ? (
              <PayslipPreview payslip={selectedPayslip} />
            ) : (
              <EmptyState title="Select a payslip" text="Choose a payslip to see its contents." compact />
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="card p-0 overflow-hidden animate-in stagger-4">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
            <div>
              <h2 className="font-bold text-lg">Payment History</h2>
              <p className="text-xs mt-1" style={{ color: '#6B6660' }}>Records appear here once payroll payments are completed.</p>
            </div>
            <CreditCard size={18} style={{ color: '#C9A020' }} />
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Pay Period</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {visiblePayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="font-semibold">{payment.id}</td>
                    <td>{payment.payPeriod}</td>
                    <td>{payment.paymentDate}</td>
                    <td>{payment.method}</td>
                    <td className="font-semibold" style={{ color: '#10B981' }}>{currency(payment.amount)}</td>
                    <td><span className="badge badge-green">{payment.status}</span></td>
                    <td className="text-xs" style={{ color: '#6B6660' }}>{payment.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visiblePayments.length === 0 && !isLoading && (
            <div className="px-5 py-10">
              <EmptyState title="No payment history" text="Completed payroll payments will show here." compact />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ color, icon, label, note, value }: {
  color: string; icon: React.ReactNode; label: string; note: string; value: React.ReactNode
}) {
  return (
    <div className="stat-card" style={{ borderBottom: `3px solid ${color}` }}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <p className="text-xs" style={{ color: '#6B6660' }}>{note}</p>
    </div>
  )
}

function PayslipPreview({ payslip }: { payslip: PayslipRecord }) {
  const earnings   = payslip.basicSalary + payslip.allowances + payslip.bonus + payslip.overtime
  const deductions = payslip.deductions + payslip.tax + payslip.pension

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B6660' }}>Employee</p>
        <p className="mt-1 font-bold">{payslip.employeeName}</p>
        <p className="text-xs mt-1" style={{ color: '#6B6660' }}>{payslip.employeeId} / {payslip.payPeriod}</p>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Earnings</h3>
        <Line label="Basic Salary"    value={payslip.basicSalary} />
        <Line label="Allowances"      value={payslip.allowances} />
        <Line label="Bonus"           value={payslip.bonus} />
        <Line label="Overtime Pay"    value={payslip.overtime} />
        <Line label="Total Earnings"  value={earnings}    strong positive />
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Deductions</h3>
        <Line label="Other Deductions" value={payslip.deductions} negative />
        <Line label="Tax (PAYE)"       value={payslip.tax}        negative />
        <Line label="Pension (8%)"     value={payslip.pension}    negative />
        <Line label="Total Deductions" value={deductions}         strong negative />
      </div>
      <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46' }}>Net Salary</p>
        <p className="mt-1 text-2xl font-bold" style={{ color: '#10B981' }}>
          {new Intl.NumberFormat('en-NG', { currency: 'NGN', maximumFractionDigits: 0, style: 'currency' }).format(payslip.netSalary)}
        </p>
      </div>
      <button type="button" className="btn-outline w-full justify-center">
        <Download size={15} /> Download PDF
      </button>
    </div>
  )
}

function Line({ label, negative = false, positive = false, strong = false, value }: {
  label: string; negative?: boolean; positive?: boolean; strong?: boolean; value: number
}) {
  const fmt = new Intl.NumberFormat('en-NG', { currency: 'NGN', maximumFractionDigits: 0, style: 'currency' })
  return (
    <div className={`flex justify-between gap-3 py-2 text-sm ${strong ? 'mt-2 border-t font-bold' : ''}`} style={{ borderColor: '#E4E1D8' }}>
      <span style={{ color: strong ? '#0D0D0D' : '#6B6660' }}>{label}</span>
      <span style={{ color: positive ? '#10B981' : negative ? '#EF4444' : '#0D0D0D' }}>
        {negative && value > 0 ? '-' : ''}{fmt.format(value)}
      </span>
    </div>
  )
}

function EmptyState({ compact = false, text, title }: { compact?: boolean; text: string; title: string }) {
  return (
    <div className={`text-center ${compact ? 'py-4' : 'py-10'}`} style={{ color: '#6B6660' }}>
      <Eye size={compact ? 22 : 30} className="mx-auto mb-2 opacity-50" />
      <p className="font-semibold" style={{ color: '#0D0D0D' }}>{title}</p>
      <p className="text-sm mt-1">{text}</p>
    </div>
  )
}
