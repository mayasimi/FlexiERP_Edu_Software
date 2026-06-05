'use client'

import { useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { Staff } from '@/types/payroll'
import { Download, Eye, Mail, Printer, Save, X } from 'lucide-react'
import { currency, downloadElementAsPdf, monthLabel, payslipPdfFilename, PayslipDocument, todayIso, type PayslipForm, type PayslipRecord } from './shared'

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const hiddenPayslipRef = useRef<HTMLDivElement | null>(null)
  const previewPayslipRef = useRef<HTMLDivElement | null>(null)
  const setField = (field: keyof PayslipForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }
  const previewPayslip = useMemo<PayslipRecord>(() => ({
    id: 'PREVIEW',
    employeeId: selectedEmployee.id,
    employeeName: selectedEmployee.name,
    payPeriod: monthLabel(form.payPeriod),
    paymentDate: form.paymentDate || todayIso(),
    basicSalary: selectedEmployee.basePay,
    allowances: Number(form.allowances || 0),
    bonus: Number(form.bonus || 0),
    overtime: Number(form.overtime || 0),
    deductions: Number(form.deductions || 0),
    tax: Number(form.tax || 0),
    pension: Number(form.pension || 0),
    netSalary: Math.max(0, netSalary),
    generatedDate: todayIso(),
    status: 'Generated',
  }), [form.allowances, form.bonus, form.deductions, form.overtime, form.payPeriod, form.paymentDate, form.pension, form.tax, netSalary, selectedEmployee.basePay, selectedEmployee.id, selectedEmployee.name])

  const openPdfDownload = async () => {
    await downloadElementAsPdf(isPreviewOpen ? previewPayslipRef.current : hiddenPayslipRef.current, payslipPdfFilename(previewPayslip))
    toast.success('Payslip PDF downloaded.')
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
          <button type="button" onClick={() => setIsPreviewOpen(true)} className="btn-outline"><Eye size={15} />Preview</button>
          <button type="button" onClick={openPdfDownload} className="btn-outline"><Download size={15} />Download PDF</button>
          <button type="button" onClick={() => printPayslip(previewPayslip)} className="btn-outline"><Printer size={15} />Print</button>
          <button type="button" onClick={() => toast.success('Payslip email queued.')} className="btn-outline"><Mail size={15} />Send Email</button>
        </div>
      </div>
      <div className="fixed left-[-10000px] top-0 w-[768px] bg-white" aria-hidden="true">
        <div ref={hiddenPayslipRef}>
          <PayslipDocument payslip={previewPayslip} role={selectedEmployee.role} />
        </div>
      </div>
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={() => setIsPreviewOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="generated-payslip-preview-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #0D0D0D, #2A2A2A)' }}>
              <div>
                <h3 id="generated-payslip-preview-title" className="text-lg font-bold">Payslip Preview</h3>
                <p className="mt-1 text-xs opacity-80">{previewPayslip.employeeName} / {previewPayslip.payPeriod}</p>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Close payslip preview">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-5">
              <div ref={previewPayslipRef}>
                <PayslipDocument payslip={previewPayslip} role={selectedEmployee.role} />
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={openPdfDownload} className="btn-outline"><Download size={15} />Download PDF</button>
                <button type="button" onClick={() => setIsPreviewOpen(false)} className="btn-gold">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
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

function printPayslip(payslip: PayslipRecord) {
  if (typeof window === 'undefined') return

  const totalEarnings = payslip.basicSalary + payslip.allowances + payslip.bonus + payslip.overtime
  const totalDeductions = payslip.deductions + payslip.tax + payslip.pension
  const rows = [
    ['Basic Salary', payslip.basicSalary],
    ['Allowances', payslip.allowances],
    ['Bonus', payslip.bonus],
    ['Overtime Pay', payslip.overtime],
    ['Total Earnings', totalEarnings],
    ['Other Deductions', payslip.deductions],
    ['Tax (PAYE)', payslip.tax],
    ['Pension', payslip.pension],
    ['Total Deductions', totalDeductions],
  ]

  const printWindow = window.open('', '_blank', 'width=900,height=1100,noopener,noreferrer')
  if (!printWindow) {
    toast.error('Allow popups to download this payslip as PDF.')
    return
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Payslip ${payslip.employeeName}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; background: #ffffff; color: #0D0D0D; font-family: Arial, sans-serif; }
          .slip { max-width: 780px; margin: 0 auto; border: 1px solid #E4E1D8; border-radius: 16px; overflow: hidden; }
          .head { background: #0D0D0D; color: white; padding: 24px; display: flex; justify-content: space-between; gap: 16px; }
          .brand { display: flex; gap: 14px; align-items: center; }
          .logo { width: 58px; height: 58px; border-radius: 12px; background: white; padding: 8px; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .eyebrow { margin: 0; color: #C9A020; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
          h1 { margin: 5px 0 0; font-size: 26px; }
          .muted { color: #6B6660; }
          .body { padding: 24px; display: grid; gap: 18px; }
          .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .tile, .panel, .net { border: 1px solid #E4E1D8; border-radius: 12px; padding: 14px; background: #F7F6F3; }
          .label { margin: 0; color: #6B6660; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
          .value { margin: 7px 0 0; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          td { padding: 10px 0; border-bottom: 1px solid #E4E1D8; }
          td:last-child { text-align: right; font-weight: 800; }
          .net { background: #ECFDF5; border-color: #BBF7D0; display: flex; justify-content: space-between; align-items: center; }
          .net strong { color: #10B981; font-size: 30px; }
          @media print { body { padding: 0; } .slip { border: none; border-radius: 0; max-width: none; } }
        </style>
      </head>
      <body>
        <section class="slip">
          <div class="head">
            <div class="brand">
              <div class="logo"><img src="${window.location.origin}/FLEXI_LOGO.png" alt="Logo" /></div>
              <div>
                <p class="eyebrow">Official Payslip</p>
                <h1>FlexiERP Edu School</h1>
                <p style="margin:6px 0 0; opacity:.75;">${payslip.payPeriod}</p>
              </div>
            </div>
            <div style="text-align:right; font-size:12px; opacity:.82;">
              <p>Slip No: <strong>${payslip.id}</strong></p>
              <p>Generated: ${payslip.generatedDate}</p>
            </div>
          </div>
          <div class="body">
            <div class="tiles">
              <div class="tile"><p class="label">Employee</p><p class="value">${payslip.employeeName}</p></div>
              <div class="tile"><p class="label">Employee ID</p><p class="value">${payslip.employeeId}</p></div>
              <div class="tile"><p class="label">Payment Date</p><p class="value">${payslip.paymentDate}</p></div>
            </div>
            <div class="panel">
              <table>
                <tbody>
                  ${rows.map(([label, amount]) => `<tr><td>${label}</td><td>${currency(Number(amount))}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div class="net">
              <div><p class="label">Net Salary</p><p class="muted">Status: ${payslip.status}</p></div>
              <strong>${currency(payslip.netSalary)}</strong>
            </div>
          </div>
        </section>
        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
