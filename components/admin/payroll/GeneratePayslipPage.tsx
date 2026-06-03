'use client'

import toast from 'react-hot-toast'
import type { Staff } from '@/types/payroll'
import { Download, Eye, Mail, Printer, Save } from 'lucide-react'
import { currency, type PayslipForm } from './shared'

export default function GeneratePayslipPage({
  form,
  netSalary,
  onGenerate,
  selectedEmployee,
  setForm,
  staff,
}: {
  form: PayslipForm
  netSalary: number
  onGenerate: () => void
  selectedEmployee: Staff
  setForm: React.Dispatch<React.SetStateAction<PayslipForm>>
  staff: Staff[]
}) {
  const setField = (field: keyof PayslipForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="card animate-in overflow-hidden p-0">
      <div className="px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #0D0D0D, #2A2A2A)' }}>
        <h2 className="text-xl font-bold">Generate Payslip</h2>
        <p className="text-sm opacity-80">Create employee salary payslip with earnings and deductions.</p>
      </div>
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="employeeId">Employee</label>
            <select id="employeeId" className="select" value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)}>
              {staff.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.id})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="payPeriod">Pay Period</label>
            <input id="payPeriod" className="input" type="month" value={form.payPeriod} onChange={(event) => setField('payPeriod', event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="paymentDate">Payment Date</label>
            <input id="paymentDate" className="input" type="date" value={form.paymentDate} onChange={(event) => setField('paymentDate', event.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-xl p-4" style={{ border: '1px solid #E4E1D8', background: '#F7F6F3' }}>
            <h3 className="mb-4 font-bold">Earnings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MoneyInput label="Basic Salary" value={String(selectedEmployee.basePay)} readOnly />
              <MoneyInput label="Allowances" value={form.allowances} onChange={(value) => setField('allowances', value)} />
              <MoneyInput label="Bonus" value={form.bonus} onChange={(value) => setField('bonus', value)} />
              <MoneyInput label="Overtime Pay" value={form.overtime} onChange={(value) => setField('overtime', value)} />
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ border: '1px solid #E4E1D8', background: '#F7F6F3' }}>
            <h3 className="mb-4 font-bold">Deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MoneyInput label="Deductions" value={form.deductions} onChange={(value) => setField('deductions', value)} />
              <MoneyInput label="Tax (PAYE)" value={form.tax} onChange={(value) => setField('tax', value)} />
              <MoneyInput label="Pension" value={form.pension} onChange={(value) => setField('pension', value)} />
              <div className="rounded-lg bg-white p-4" style={{ border: '1px solid #E4E1D8' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B6660' }}>Net Salary</p>
                <p className="mt-2 text-2xl font-bold" style={{ color: '#10B981' }}>{currency(netSalary)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onGenerate} className="btn-gold"><Save size={15} />Generate & Save</button>
          <button type="button" onClick={() => toast('Payslip preview opened.')} className="btn-outline"><Eye size={15} />Preview</button>
          <button type="button" onClick={() => toast.success('PDF download started.')} className="btn-outline"><Download size={15} />Download PDF</button>
          <button type="button" onClick={() => toast('Print dialog prepared.')} className="btn-outline"><Printer size={15} />Print</button>
          <button type="button" onClick={() => toast.success('Payslip email queued.')} className="btn-outline"><Mail size={15} />Send Email</button>
        </div>
      </div>
    </div>
  )
}

function MoneyInput({ label, onChange, readOnly = false, value }: { label: string; onChange?: (value: string) => void; readOnly?: boolean; value: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" min="0" onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} type="number" value={value} />
    </div>
  )
}
