'use client'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'
import Card from '@/components/ui/Card'
import GoldBadge from '@/components/ui/GoldBadge'

export default function FeesView() {
  const { data: feesData = {
    total_due:       0,
    outstanding:     0,
    fee_breakdown:   [],
    payment_history: [],
    is_paid_on_time: false,
  }} = useQuery({
    queryKey: ['portal-fees'],
    queryFn:  () => portalApi.getFees().then(r => r.data),
  })

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#9B9590' }}>School Fees</p>
        <h2 style={{ margin: '10px 0 0', fontSize: 28, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>Payment Summary</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <Card>
          <p style={{ margin: 0, fontSize: 11, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1.2 }}>Total Due</p>
          <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700 }}>₦{feesData.total_due.toLocaleString()}</p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 11, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1.2 }}>Outstanding</p>
          <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700 }}>₦{feesData.outstanding.toLocaleString()}</p>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1.2 }}>Fee Breakdown</p>
            <h3 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700 }}>Current Term</h3>
          </div>
          <GoldBadge color={feesData.is_paid_on_time ? '#1D9E75' : '#EF4444'}>
            {feesData.is_paid_on_time ? 'Paid on time' : 'Has outstanding'}
          </GoldBadge>
        </div>

        {feesData.fee_breakdown.length === 0 ? (
          <p style={{ color: '#9B9590', fontSize: 13 }}>No fee records found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {feesData.fee_breakdown.map((item: { label: string; amount: number }, index: number) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', color: '#5C5750' }}>
                <span>{item.label}</span>
                <strong>₦{item.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p style={{ margin: 0, fontSize: 12, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1.2 }}>Payment History</p>
        {feesData.payment_history.length === 0 ? (
          <p style={{ marginTop: 16, color: '#9B9590', fontSize: 13 }}>No payment history yet.</p>
        ) : (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {feesData.payment_history.map((item: { date: string; desc: string; amount: number; method: string }, index: number) => (
              <div key={index} style={{ display: 'grid', gap: 4, padding: 14, borderRadius: 14, background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 700 }}>{item.date}</span>
                  <GoldBadge>{item.method}</GoldBadge>
                </div>
                <p style={{ margin: 0, color: '#5C5750' }}>{item.desc}</p>
                <strong style={{ marginTop: 6 }}>₦{item.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
