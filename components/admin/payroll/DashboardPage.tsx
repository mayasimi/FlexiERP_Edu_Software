'use client'

import toast from 'react-hot-toast'
import type { PayrollFilter, Staff } from '@/types/payroll'
import { getInitials } from '@/lib/utils'
import { Banknote, CheckCircle2, CircleDollarSign, Download, Minus, Plus, Search, SlidersHorizontal, Users } from 'lucide-react'
import { currency, SummaryCard } from './shared'

const adjustmentOptions = [
  { label: '+100', value: 100, icon: Plus },
  { label: '-100', value: -100, icon: Minus },
]

export default function DashboardPage({
  allVisibleUnpaidSelected,
  filter,
  filteredStaff,
  paymentNotice,
  paySelectedPayroll,
  payStaff,
  query,
  runPendingPayroll,
  selectedStaff,
  selectedStaffIds,
  selectedTotal,
  setFilter,
  setQuery,
  summary,
  togglePaid,
  toggleStaffSelection,
  toggleVisibleSelection,
  updatePay,
}: {
  allVisibleUnpaidSelected: boolean
  filter: PayrollFilter
  filteredStaff: Staff[]
  paymentNotice: string
  paySelectedPayroll: () => void
  payStaff: (member: Staff) => void
  query: string
  runPendingPayroll: () => void
  selectedStaff: Staff[]
  selectedStaffIds: string[]
  selectedTotal: number
  setFilter: (filter: PayrollFilter) => void
  setQuery: (query: string) => void
  summary: {
    totalStaff: number
    totalBasePay: number
    totalCurrentPay: number
    paidStaff: number
    unpaidStaff: number
  }
  togglePaid: (staffId: string) => void
  toggleStaffSelection: (staffId: string) => void
  toggleVisibleSelection: () => void
  updatePay: (staffId: string, delta: number) => void
}) {
  return (
    <div className="space-y-5 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard border="#C9A020" icon={<Users size={18} style={{ color: '#C9A020' }} />} label="Staff on Payroll" value={summary.totalStaff} note={`${summary.unpaidStaff} pending payment`} />
        <SummaryCard border="#0D0D0D" icon={<CircleDollarSign size={18} style={{ color: '#0D0D0D' }} />} label="Base Payroll" value={currency(summary.totalBasePay)} note="Contracted monthly salary" />
        <SummaryCard border="#10B981" icon={<Banknote size={18} style={{ color: '#10B981' }} />} label="Current Payroll" value={currency(summary.totalCurrentPay)} note={`${summary.totalCurrentPay - summary.totalBasePay >= 0 ? '+' : ''}${currency(summary.totalCurrentPay - summary.totalBasePay)} net adjustment`} noteColor="#10B981" />
        <SummaryCard border="#10B981" icon={<CheckCircle2 size={18} style={{ color: '#10B981' }} />} label="Paid Staff" value={summary.paidStaff} note={`${Math.round((summary.paidStaff / Math.max(summary.totalStaff, 1)) * 100)}% completed`} />
      </div>

      {paymentNotice && (
        <div className="rounded-lg px-4 py-3" style={{ background: '#C9A02014', border: '1px solid #C9A02044' }}>
          <p className="text-sm font-semibold" style={{ color: '#6B6660' }}>{paymentNotice}</p>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff, role, ID, or bank" className="input pl-9" />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={paySelectedPayroll} disabled={selectedStaff.length === 0} className={selectedStaff.length === 0 ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-gold'}>Pay Selected</button>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
              {(['all', 'paid', 'unpaid'] as PayrollFilter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all"
                  style={{
                    background: filter === item ? '#FFFFFF' : 'transparent',
                    color: filter === item ? '#C9A020' : '#6B6660',
                    boxShadow: filter === item ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => toast('Advanced filters coming soon.')} className="btn-outline"><SlidersHorizontal size={15} />Filters</button>
            <button type="button" onClick={() => toast.success('Payroll export queued.')} className="btn-outline"><Download size={15} />Export</button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-5 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
          <div>
            <h2 className="font-bold text-base">Staff Payroll</h2>
            <p className="text-xs mt-1" style={{ color: '#6B6660' }}>{selectedStaff.length} selected / {currency(selectedTotal)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={paySelectedPayroll} disabled={selectedStaff.length === 0} className={selectedStaff.length === 0 ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-gold'}>Pay Selected</button>
            <button onClick={runPendingPayroll} className="btn-outline">Pay All</button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allVisibleUnpaidSelected} onChange={toggleVisibleSelection} disabled={filteredStaff.every((member) => member.paid)} aria-label="Select visible unpaid staff" style={{ accentColor: '#C9A020', width: 15, height: 15 }} /></th>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Base Pay</th>
                <th>Current Pay</th>
                <th>Bank Details</th>
                <th>Status</th>
                <th>Adjust</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => {
                const adjustment = member.currentPay - member.basePay

                return (
                  <tr key={member.id}>
                    <td><input type="checkbox" checked={selectedStaffIds.includes(member.id)} onChange={() => toggleStaffSelection(member.id)} disabled={member.paid} aria-label={`Select ${member.name}`} style={{ accentColor: '#C9A020', width: 15, height: 15 }} /></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>{getInitials(member.name)}</div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{member.name}</p>
                          <p className="text-xs" style={{ color: '#6B6660' }}>{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#6B6660' }}>{member.role}</td>
                    <td className="font-semibold">{currency(member.basePay)}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold">{currency(member.currentPay)}</span>
                        <span className="text-xs" style={{ color: adjustment >= 0 ? '#10B981' : '#EF4444' }}>{adjustment >= 0 ? '+' : ''}{currency(adjustment)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.bankName}</span>
                        <span className="text-xs" style={{ color: '#6B6660' }}>{member.accountNumber}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${member.paid ? 'badge-green' : 'badge-gold'}`}>{member.paid ? 'Paid' : 'Pending'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {adjustmentOptions.map(({ label, value, icon: Icon }) => (
                          <button key={label} onClick={() => updatePay(member.id, value)} disabled={member.paid} className="btn-outline px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50" title={`${label} payroll adjustment`}>
                            <Icon size={12} />
                            {label.replace('+', '')}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button onClick={() => (member.paid ? togglePaid(member.id) : payStaff(member))} className={member.paid ? 'btn-outline text-xs py-1.5' : 'btn-gold text-xs py-1.5'}>{member.paid ? 'Reopen' : 'Pay'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && <div className="px-5 py-12 text-center" style={{ color: '#6B6660' }}>No payroll records match the current search.</div>}
      </div>
    </div>
  )
}
