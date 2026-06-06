import { Banknote, CalendarDays, CreditCard } from 'lucide-react'
import { currency, HistoryTable, SummaryCard, type PaymentRecord } from './shared'

export default function PaymentHistoryPage({ payments }: { payments: PaymentRecord[] }) {
  const total = payments.reduce((sum, item) => sum + item.amount, 0)
  const average = payments.length > 0 ? total / payments.length : 0

  return (
    <div className="space-y-5 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard border="#C9A020" icon={<CreditCard size={18} style={{ color: '#C9A020' }} />} label="Total Payments" value={payments.length} note="Payroll payment records" />
        <SummaryCard border="#10B981" icon={<Banknote size={18} style={{ color: '#10B981' }} />} label="Total Amount" value={currency(total)} note="Completed payment value" noteColor="#10B981" />
        <SummaryCard border="#0D0D0D" icon={<CalendarDays size={18} style={{ color: '#0D0D0D' }} />} label="Average Payment" value={currency(average)} note="Mean payroll transfer" />
      </div>
      <HistoryTable
        columns={['Payment ID', 'Employee Name', 'Pay Period', 'Payment Date', 'Payment Method', 'Amount Paid', 'Status', 'Reference Number']}
        rows={payments.map((item) => [
          item.id,
          item.employeeName,
          item.payPeriod,
          item.paymentDate,
          item.method,
          currency(item.amount),
          <span key="status" className="badge badge-green">{item.status}</span>,
          item.reference,
        ])}
      />
    </div>
  )
}
