'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import type { PayrollFilter, PayrollPayment, Staff } from '@/types/payroll'
import { Banknote, ChevronDown } from 'lucide-react'
import DashboardPage from './payroll/DashboardPage'
import GeneratePayslipPage from './payroll/GeneratePayslipPage'
import PaymentHistoryPage from './payroll/PaymentHistoryPage'
import PayslipHistoryPage from './payroll/PayslipHistoryPage'
import {
  ADMIN_EMAIL,
  INITIAL_PAYMENTS,
  INITIAL_PAYSLIPS,
  INITIAL_STAFF,
  PAYROLL_PAYMENTS_STORAGE_KEY,
  PAYROLL_PAYSLIPS_STORAGE_KEY,
  makePayrollPayment,
  monthLabel,
  navigationItems,
  pageLabels,
  readStoredRecords,
  todayIso,
  type PaymentRecord,
  type PayrollPage,
  type PayslipForm,
  type PayslipRecord,
} from './payroll/shared'

const PayrollPayStackModal = dynamic(() => import('@/components/payment/PayrollPayStackModal'), { ssr: false })

export default function PayrollManagement() {
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF)
  const [payslips, setPayslips] = useState<PayslipRecord[]>(() =>
    readStoredRecords(PAYROLL_PAYSLIPS_STORAGE_KEY, INITIAL_PAYSLIPS),
  )
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    readStoredRecords(PAYROLL_PAYMENTS_STORAGE_KEY, INITIAL_PAYMENTS),
  )
  const [activePage, setActivePage] = useState<PayrollPage>('dashboard')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PayrollFilter>('all')
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paystackPayment, setPaystackPayment] = useState<PayrollPayment | null>(null)
  const [paymentStaffIds, setPaymentStaffIds] = useState<string[]>([])
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [isPayrollMenuOpen, setIsPayrollMenuOpen] = useState(false)
  const [payslipForm, setPayslipForm] = useState<PayslipForm>({
    employeeId: INITIAL_STAFF[0].id,
    payPeriod: '2026-05',
    paymentDate: todayIso(),
    allowances: '0',
    bonus: '0',
    overtime: '0',
    deductions: '0',
    tax: '0',
    pension: '0',
  })

  useEffect(() => {
    window.localStorage.setItem(PAYROLL_PAYSLIPS_STORAGE_KEY, JSON.stringify(payslips))
  }, [payslips])

  useEffect(() => {
    window.localStorage.setItem(PAYROLL_PAYMENTS_STORAGE_KEY, JSON.stringify(payments))
  }, [payments])

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
      { totalStaff: 0, totalBasePay: 0, totalCurrentPay: 0, paidStaff: 0, unpaidStaff: 0 },
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

  const selectedStaff = useMemo(
    () => staff.filter((member) => selectedStaffIds.includes(member.id) && !member.paid),
    [selectedStaffIds, staff],
  )
  const selectableStaff = useMemo(() => filteredStaff.filter((member) => !member.paid), [filteredStaff])
  const selectedTotal = selectedStaff.reduce((total, member) => total + member.currentPay, 0)
  const allVisibleUnpaidSelected =
    selectableStaff.length > 0 && selectableStaff.every((member) => selectedStaffIds.includes(member.id))
  const selectedEmployee = staff.find((member) => member.id === payslipForm.employeeId) || staff[0]
  const payslipNetSalary =
    selectedEmployee.basePay +
    Number(payslipForm.allowances || 0) +
    Number(payslipForm.bonus || 0) +
    Number(payslipForm.overtime || 0) -
    Number(payslipForm.deductions || 0) -
    Number(payslipForm.tax || 0) -
    Number(payslipForm.pension || 0)

  const updatePay = (staffId: string, delta: number) => {
    setStaff((currentStaff) =>
      currentStaff.map((member) =>
        member.id === staffId && !member.paid
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
      toast.error('There are no pending payroll records to pay.')
      return
    }

    setPaymentNotice('')
    setPaymentStaffIds(members.map((member) => member.id))
    setPaystackPayment(makePayrollPayment(members))
  }

  const runPendingPayroll = () => {
    openPayrollPayment(staff.filter((member) => !member.paid))
  }

  const paySelectedPayroll = () => {
    openPayrollPayment(selectedStaff)
  }

  const handlePaymentSuccess = ({ reference }: { staffId: string; reference: string; amount: number }) => {
    const paidMembers = staff.filter((member) => paymentStaffIds.includes(member.id))

    setStaff((currentStaff) =>
      currentStaff.map((member) =>
        paymentStaffIds.includes(member.id) ? { ...member, paid: true } : member,
      ),
    )
    setPayments((current) => [
      ...paidMembers.map((member, index) => ({
        id: `PAY-${String(current.length + index + 1).padStart(3, '0')}`,
        employeeId: member.id,
        employeeName: member.name,
        payPeriod: monthLabel(payslipForm.payPeriod),
        paymentDate: todayIso(),
        method: 'Paystack',
        amount: member.currentPay,
        status: 'Completed' as const,
        reference,
      })),
      ...current,
    ])
    setPaymentNotice(`Payroll payment successful. Reference: ${reference}`)
    toast.success(`Payroll payment successful. Reference: ${reference}`)
    setPaymentStaffIds([])
    setSelectedStaffIds((current) => current.filter((id) => !paymentStaffIds.includes(id)))
  }

  const handlePaymentError = (error: string) => {
    setPaymentNotice(error)
    toast.error(error)
  }

  const handleGeneratePayslip = () => {
    const record: PayslipRecord = {
      id: `PSL-${String(payslips.length + 1).padStart(3, '0')}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      payPeriod: monthLabel(payslipForm.payPeriod),
      paymentDate: payslipForm.paymentDate,
      basicSalary: selectedEmployee.basePay,
      allowances: Number(payslipForm.allowances || 0),
      bonus: Number(payslipForm.bonus || 0),
      overtime: Number(payslipForm.overtime || 0),
      deductions: Number(payslipForm.deductions || 0),
      tax: Number(payslipForm.tax || 0),
      pension: Number(payslipForm.pension || 0),
      netSalary: Math.max(0, payslipNetSalary),
      generatedDate: todayIso(),
      status: 'Generated',
    }
    setPayslips((current) => [record, ...current])
    toast.success(`Payslip generated for ${selectedEmployee.name}.`)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'Pay All', onClick: runPendingPayroll }} />

      <div className="page-header animate-in relative z-[200]">
        <div className="gold-accent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#6B6660' }}>
              <span>Dashboard</span>
              <ChevronDown size={13} className="-rotate-90" />
              <span className="font-semibold" style={{ color: '#0D0D0D' }}>{pageLabels[activePage]}</span>
            </div>
          </div>

          <div className="relative z-[100]" onMouseEnter={() => setIsPayrollMenuOpen(true)} onMouseLeave={() => setIsPayrollMenuOpen(false)}>
            <button type="button" onClick={() => setIsPayrollMenuOpen((current) => !current)} className="btn-gold rounded-full px-5 py-2.5 shadow-sm">
              <Banknote size={16} />
              Payroll
              <ChevronDown size={14} />
            </button>
            <div
              className="absolute right-0 top-full z-[9999] mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-xl transition-all"
              style={{
                border: '1px solid #E4E1D8',
                opacity: isPayrollMenuOpen ? 1 : 0,
                transform: isPayrollMenuOpen ? 'translateY(0)' : 'translateY(-8px)',
                pointerEvents: isPayrollMenuOpen ? 'auto' : 'none',
              }}
            >
              {navigationItems.map(({ page, label, icon: Icon }) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    setActivePage(page)
                    setIsPayrollMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all hover:bg-[#F7F6F3]"
                  style={{ color: activePage === page ? '#C9A020' : '#0D0D0D' }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 px-6 pb-8">
        {activePage === 'dashboard' && (
          <DashboardPage
            allVisibleUnpaidSelected={allVisibleUnpaidSelected}
            filter={filter}
            filteredStaff={filteredStaff}
            paymentNotice={paymentNotice}
            paySelectedPayroll={paySelectedPayroll}
            payStaff={(member) => openPayrollPayment([member])}
            query={query}
            runPendingPayroll={runPendingPayroll}
            selectedStaff={selectedStaff}
            selectedStaffIds={selectedStaffIds}
            selectedTotal={selectedTotal}
            setFilter={setFilter}
            setQuery={setQuery}
            summary={summary}
            togglePaid={togglePaid}
            toggleStaffSelection={toggleStaffSelection}
            toggleVisibleSelection={toggleVisibleSelection}
            updatePay={updatePay}
          />
        )}

        {activePage === 'generate' && (
          <GeneratePayslipPage
            form={payslipForm}
            netSalary={Math.max(0, payslipNetSalary)}
            onGenerate={handleGeneratePayslip}
            selectedEmployee={selectedEmployee}
            setForm={setPayslipForm}
            staff={staff}
          />
        )}

        {activePage === 'payslips' && <PayslipHistoryPage payslips={payslips} />}
        {activePage === 'payments' && <PaymentHistoryPage payments={payments} />}
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
