'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { PayrollFilter, PayrollPayment, Staff } from '@/types/payroll'
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react'

const PayrollPayStackModal = dynamic(() => import('@/components/payment/PayrollPayStackModal'), { ssr: false })
const ADMIN_EMAIL = 'admin@edumanage.edu'
const currency = (amount: number) => formatCurrency(amount, 'NGN')

const INITIAL_STAFF: Staff[] = [
  {
    id: 'STF-001',
    name: 'Dr. Sarah Jenkins',
    role: 'Head of Mathematics',
    basePay: 6200,
    currentPay: 6200,
    paid: true,
    bankName: 'First National Bank',
    accountNumber: '**** 4211',
  },
  {
    id: 'STF-002',
    name: 'Prof. Robert Chen',
    role: 'Senior Lecturer',
    basePay: 5400,
    currentPay: 5650,
    paid: false,
    bankName: 'Cedar Trust Bank',
    accountNumber: '**** 8934',
  },
  {
    id: 'STF-003',
    name: 'Elena Rostova',
    role: 'Academic Coordinator',
    basePay: 4900,
    currentPay: 4750,
    paid: false,
    bankName: 'Metro Credit Union',
    accountNumber: '**** 1765',
  },
  {
    id: 'STF-004',
    name: 'David Kim',
    role: 'Adjunct Professor',
    basePay: 3800,
    currentPay: 3800,
    paid: true,
    bankName: 'Union Finance',
    accountNumber: '**** 0288',
  },
  {
    id: 'STF-005',
    name: 'Prof. Alan Smith',
    role: 'Senior Lecturer',
    basePay: 5200,
    currentPay: 5300,
    paid: false,
    bankName: 'Heritage Bank',
    accountNumber: '**** 6420',
  },
  {
    id: 'STF-006',
    name: 'Dr. Maria Santos',
    role: 'Lab Instructor',
    basePay: 4100,
    currentPay: 4100,
    paid: true,
    bankName: 'Sterling Campus Bank',
    accountNumber: '**** 3091',
  },
]

const adjustmentOptions = [
  { label: '+100', value: 100, icon: Plus },
  { label: '-100', value: -100, icon: Minus },
]

export default function PayrollManagement() {
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PayrollFilter>('all')
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paystackPayment, setPaystackPayment] = useState<PayrollPayment | null>(null)
  const [paymentStaffIds, setPaymentStaffIds] = useState<string[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])

  const summary = useMemo(() => {
    return staff.reduce(
      (acc, member) => {
        acc.totalStaff += 1
        acc.totalBasePay += member.basePay
        acc.totalCurrentPay += member.currentPay
        if (member.paid) {
          acc.paidStaff += 1
        } else {
          acc.unpaidStaff += 1
        }
        return acc
      },
      {
        totalStaff: 0,
        totalBasePay: 0,
        totalCurrentPay: 0,
        paidStaff: 0,
        unpaidStaff: 0,
      },
    )
  }, [staff])

  const filteredStaff = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return staff.filter((member) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'paid' && member.paid) ||
        (filter === 'unpaid' && !member.paid)

      const matchesQuery =
        !normalizedQuery ||
        member.name.toLowerCase().includes(normalizedQuery) ||
        member.role.toLowerCase().includes(normalizedQuery) ||
        member.id.toLowerCase().includes(normalizedQuery) ||
        member.bankName.toLowerCase().includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [filter, query, staff])

  const selectableStaff = useMemo(() => filteredStaff.filter((member) => !member.paid), [filteredStaff])
  const selectedStaff = useMemo(
    () => staff.filter((member) => selectedStaffIds.includes(member.id) && !member.paid),
    [selectedStaffIds, staff],
  )
  const selectedTotal = selectedStaff.reduce((total, member) => total + member.currentPay, 0)
  const allVisibleUnpaidSelected =
    selectableStaff.length > 0 && selectableStaff.every((member) => selectedStaffIds.includes(member.id))

  const updatePay = (staffId: string, delta: number) => {
    setStaff((currentStaff) =>
      currentStaff.map((member) =>
        member.id === staffId
          ? { ...member, currentPay: Math.max(0, member.currentPay + delta) }
          : member,
      ),
    )
  }

  const togglePaid = (staffId: string) => {
    setStaff((currentStaff) =>
      currentStaff.map((member) =>
        member.id === staffId ? { ...member, paid: !member.paid } : member,
      ),
    )
    setSelectedStaffIds((current) => current.filter((id) => id !== staffId))
  }

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds((current) =>
      current.includes(staffId)
        ? current.filter((id) => id !== staffId)
        : [...current, staffId],
    )
  }

  const toggleVisibleSelection = () => {
    const visibleIds = selectableStaff.map((member) => member.id)
    setSelectedStaffIds((current) =>
      allVisibleUnpaidSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    )
  }

  const openPayrollPayment = (members: Staff[]) => {
    if (members.length === 0) {
      setPaymentNotice('There are no pending payroll records to pay.')
      return
    }

    const amount = members.reduce((total, member) => total + member.currentPay, 0)
    const payment: PayrollPayment =
      members.length === 1
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

    setPaymentNotice('')
    setPaymentStaffIds(members.map((member) => member.id))
    setPaystackPayment(payment)
  }

  const runPendingPayroll = () => {
    openPayrollPayment(staff.filter((member) => !member.paid))
  }

  const paySelectedPayroll = () => {
    openPayrollPayment(selectedStaff)
  }

  const handlePaymentSuccess = (_staffId: string, reference: string) => {
    setStaff((currentStaff) =>
      currentStaff.map((member) =>
        paymentStaffIds.includes(member.id) ? { ...member, paid: true } : member,
      ),
    )
    setPaymentNotice(`Payroll payment successful. Reference: ${reference}`)
    setPaymentStaffIds([])
    setSelectedStaffIds((current) => current.filter((id) => !paymentStaffIds.includes(id)))
  }

  const handlePaymentError = (error: string) => {
    setPaymentNotice(error)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'Pay All', onClick: runPendingPayroll }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Payroll Management</h1>
        <p className="page-subtitle">Review staff compensation, payment status, and monthly payroll totals.</p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-in stagger-1">
          <div className="stat-card" style={{ borderBottom: '3px solid #C9A020' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Staff on Payroll</span>
              <Users size={18} style={{ color: '#C9A020' }} />
            </div>
            <div className="stat-value">{summary.totalStaff}</div>
            <p className="text-xs" style={{ color: '#6B6660' }}>{summary.unpaidStaff} pending payment</p>
          </div>

          <div className="stat-card" style={{ borderBottom: '3px solid #0D0D0D' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Base Payroll</span>
              <CircleDollarSign size={18} style={{ color: '#0D0D0D' }} />
            </div>
            <div className="stat-value">{currency(summary.totalBasePay)}</div>
            <p className="text-xs" style={{ color: '#6B6660' }}>Contracted monthly salary</p>
          </div>

          <div className="stat-card" style={{ borderBottom: '3px solid #10B981' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Current Payroll</span>
              <Banknote size={18} style={{ color: '#10B981' }} />
            </div>
            <div className="stat-value">{currency(summary.totalCurrentPay)}</div>
            <p className="text-xs" style={{ color: '#10B981' }}>
              {currency(summary.totalCurrentPay - summary.totalBasePay)} net adjustment
            </p>
          </div>

          <div className="stat-card" style={{ borderBottom: '3px solid #10B981' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Paid Staff</span>
              <CheckCircle2 size={18} style={{ color: '#10B981' }} />
            </div>
            <div className="stat-value">{summary.paidStaff}</div>
            <p className="text-xs" style={{ color: '#6B6660' }}>
              {Math.round((summary.paidStaff / Math.max(summary.totalStaff, 1)) * 100)}% completed
            </p>
          </div>
        </div>

        {paymentNotice && (
          <div className="animate-in stagger-2 rounded-lg px-4 py-3" style={{ background: '#C9A02014', border: '1px solid #C9A02044' }}>
            <p className="text-sm font-semibold" style={{ color: '#6B6660' }}>{paymentNotice}</p>
          </div>
        )}

        <div className="card animate-in stagger-2">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search staff, role, ID, or bank"
                className="input pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={paySelectedPayroll}
                disabled={selectedStaff.length === 0}
                className={selectedStaff.length === 0 ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-gold'}
              >
                Pay Selected
              </button>
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
              <button className="btn-outline">
                <SlidersHorizontal size={15} />
                Filters
              </button>
              <button className="btn-outline">
                <Download size={15} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="card p-0 overflow-hidden animate-in stagger-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-5 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
            <div>
              <h2 className="font-bold text-base">Staff Payroll</h2>
              <p className="text-xs mt-1" style={{ color: '#6B6660' }}>
                {selectedStaff.length} selected / {currency(selectedTotal)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={paySelectedPayroll}
                disabled={selectedStaff.length === 0}
                className={selectedStaff.length === 0 ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-gold'}
              >
                Pay Selected
              </button>
              <button onClick={runPendingPayroll} className="btn-outline">
                Pay All
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleUnpaidSelected}
                      onChange={toggleVisibleSelection}
                      disabled={selectableStaff.length === 0}
                      aria-label="Select visible unpaid staff"
                      style={{ accentColor: '#C9A020', width: 15, height: 15 }}
                    />
                  </th>
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
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(member.id)}
                          onChange={() => toggleStaffSelection(member.id)}
                          disabled={member.paid}
                          aria-label={`Select ${member.name}`}
                          style={{ accentColor: '#C9A020', width: 15, height: 15 }}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}
                          >
                            {getInitials(member.name)}
                          </div>
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
                          <span
                            className="text-xs"
                            style={{ color: adjustment >= 0 ? '#10B981' : '#EF4444' }}
                          >
                            {adjustment >= 0 ? '+' : ''}{currency(adjustment)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.bankName}</span>
                          <span className="text-xs" style={{ color: '#6B6660' }}>{member.accountNumber}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${member.paid ? 'badge-green' : 'badge-gold'}`}>
                          {member.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {adjustmentOptions.map(({ label, value, icon: Icon }) => (
                            <button
                              key={label}
                              onClick={() => updatePay(member.id, value)}
                              className="btn-outline px-2 py-1.5 text-xs"
                              title={`${label} payroll adjustment`}
                            >
                              <Icon size={12} />
                              {label.replace('+', '')}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => (member.paid ? togglePaid(member.id) : openPayrollPayment([member]))}
                          className={member.paid ? 'btn-outline text-xs py-1.5' : 'btn-gold text-xs py-1.5'}
                        >
                          {member.paid ? 'Reopen' : 'Pay'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredStaff.length === 0 && (
            <div className="px-5 py-12 text-center" style={{ color: '#6B6660' }}>
              No payroll records match the current search.
            </div>
          )}
        </div>
      </div>

      <PayrollPayStackModal
        isOpen={Boolean(paystackPayment)}
        onClose={() => setPaystackPayment(null)}
        payment={paystackPayment}
        adminEmail={ADMIN_EMAIL}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </AppLayout>
  )
}
