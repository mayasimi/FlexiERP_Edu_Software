'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Banknote, CalendarDays, Download, Eye, FileText, Search, X } from 'lucide-react'
import { currency, HistoryTable, SummaryCard, type PayslipRecord } from './shared'

export default function PayslipHistoryPage({ payslips }: { payslips: PayslipRecord[] }) {
  const [staffQuery, setStaffQuery] = useState('')
  const [dateQuery, setDateQuery] = useState('')
  const [monthQuery, setMonthQuery] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null)
  const filteredPayslips = useMemo(() => {
    const normalizedStaff = staffQuery.trim().toLowerCase()
    const normalizedMonth = monthQuery ? new Date(`${monthQuery}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase() : ''

    return payslips.filter((item) => {
      const matchesStaff =
        !normalizedStaff ||
        item.employeeName.toLowerCase().includes(normalizedStaff) ||
        item.employeeId.toLowerCase().includes(normalizedStaff) ||
        item.id.toLowerCase().includes(normalizedStaff)

      const matchesDate =
        !dateQuery ||
        item.generatedDate === dateQuery ||
        item.paymentDate === dateQuery

      const matchesMonth =
        !normalizedMonth ||
        item.payPeriod.toLowerCase() === normalizedMonth

      return matchesStaff && matchesDate && matchesMonth
    })
  }, [dateQuery, monthQuery, payslips, staffQuery])
  const total = filteredPayslips.reduce((sum, item) => sum + item.netSalary, 0)

  return (
    <div className="space-y-5 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard border="#C9A020" icon={<FileText size={18} style={{ color: '#C9A020' }} />} label="Total Payslips" value={filteredPayslips.length} note={`${payslips.length} generated payroll documents`} />
        <SummaryCard border="#10B981" icon={<Banknote size={18} style={{ color: '#10B981' }} />} label="Total Amount" value={currency(total)} note="Across matching payslips" noteColor="#10B981" />
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={staffQuery}
              onChange={(event) => setStaffQuery(event.target.value)}
              placeholder="Search staff name, ID, or payslip number"
              className="input pl-9"
            />
          </div>
          <div className="relative">
            <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={dateQuery}
              onChange={(event) => setDateQuery(event.target.value)}
              type="date"
              className="input pl-9"
              aria-label="Search by generated or payment date"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={monthQuery}
              onChange={(event) => setMonthQuery(event.target.value)}
              type="month"
              className="input"
              aria-label="Search by pay period"
            />
            <button
              type="button"
              onClick={() => {
                setStaffQuery('')
                setDateQuery('')
                setMonthQuery('')
              }}
              className="btn-outline flex-shrink-0"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
      <HistoryTable
        columns={['Payslip Number', 'Employee Name', 'Pay Period', 'Net Salary', 'Generated Date', 'Status', 'Actions']}
        rows={filteredPayslips.map((item) => [
          item.id,
          item.employeeName,
          item.payPeriod,
          currency(item.netSalary),
          item.generatedDate,
          <span key="status" className={`badge ${item.status === 'Paid' ? 'badge-green' : 'badge-gold'}`}>{item.status}</span>,
          <div key="actions" className="flex gap-2">
            <button type="button" onClick={() => setSelectedPayslip(item)} className="btn-outline px-2 py-1 text-xs"><Eye size={13} /> View</button>
            <button type="button" onClick={() => toast.success('Payslip PDF downloaded.')} className="btn-outline px-2 py-1 text-xs"><Download size={13} /> PDF</button>
          </div>,
        ])}
      />

      {filteredPayslips.length === 0 && (
        <div className="card px-5 py-10 text-center" style={{ color: '#6B6660' }}>
          No payslips match the staff/date query.
        </div>
      )}

      {selectedPayslip && <PayslipDetailModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />}
    </div>
  )
}

function PayslipDetailModal({ onClose, payslip }: { onClose: () => void; payslip: PayslipRecord }) {
  const totalEarnings = payslip.basicSalary + payslip.allowances + payslip.bonus + payslip.overtime
  const totalDeductions = payslip.deductions + payslip.tax + payslip.pension

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-detail-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #0D0D0D, #2A2A2A)' }}>
          <div>
            <h2 id="payslip-detail-title" className="text-xl font-bold">Payslip Details</h2>
            <p className="mt-1 text-sm opacity-80">{payslip.id} / {payslip.payPeriod}</p>
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-all hover:bg-white/20"
            aria-label="Close payslip detail"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <DetailTile label="Employee" value={payslip.employeeName} />
            <DetailTile label="Payment Date" value={payslip.paymentDate} />
            <DetailTile label="Status" value={<span className={`badge ${payslip.status === 'Paid' ? 'badge-green' : 'badge-gold'}`}>{payslip.status}</span>} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
              <h3 className="mb-3 font-bold">Earnings</h3>
              <LineItem label="Basic Salary" value={payslip.basicSalary} />
              <LineItem label="Allowances" value={payslip.allowances} />
              <LineItem label="Bonus" value={payslip.bonus} />
              <LineItem label="Overtime Pay" value={payslip.overtime} />
              <LineItem label="Total Earnings" value={totalEarnings} strong positive />
            </div>

            <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
              <h3 className="mb-3 font-bold">Deductions</h3>
              <LineItem label="Deductions" value={payslip.deductions} negative />
              <LineItem label="Tax (PAYE)" value={payslip.tax} negative />
              <LineItem label="Pension" value={payslip.pension} negative />
              <LineItem label="Total Deductions" value={totalDeductions} strong negative />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#065F46' }}>Net Salary</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: '#10B981' }}>{currency(payslip.netSalary)}</p>
            </div>
            <div className="text-sm md:text-right" style={{ color: '#065F46' }}>
              <p>Generated: {payslip.generatedDate}</p>
              <p>Employee ID: {payslip.employeeId}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => toast.success('Payslip PDF downloaded.')} className="btn-outline"><Download size={15} />Download PDF</button>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onClose()
              }}
              className="btn-gold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B6660' }}>{label}</p>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  )
}

function LineItem({ label, negative = false, positive = false, strong = false, value }: { label: string; negative?: boolean; positive?: boolean; strong?: boolean; value: number }) {
  return (
    <div className={`flex justify-between gap-3 py-2 ${strong ? 'mt-2 border-t font-bold' : ''}`} style={{ borderColor: '#E4E1D8' }}>
      <span style={{ color: strong ? '#0D0D0D' : '#6B6660' }}>{label}</span>
      <span style={{ color: positive ? '#10B981' : negative ? '#EF4444' : '#0D0D0D' }}>{negative && value > 0 ? '-' : ''}{currency(value)}</span>
    </div>
  )
}
