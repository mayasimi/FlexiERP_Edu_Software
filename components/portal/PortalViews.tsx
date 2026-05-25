'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { FeeItem } from '@/components/payment/PayStackModal'
import { mockData, getGrade, GOLD, BORDER, BLUE, GREEN, RED } from './portalData'
import { Avatar, Card, CardLabel, GoldBadge, StatCard } from './portalUi'
import { RoleType } from './portalTypes'

const PayStackModal = dynamic(() => import('@/components/payment/PayStackModal'), { ssr: false })

export function Dashboard({ role }: { role: RoleType }) {
  const d = mockData.student
  const totalFeesDue = d.fees.structure.reduce((sum, fee) => sum + fee.amount, 0)
  const avgAtt = Math.round(
    d.attendance.reduce((sum, item) => sum + (item.present / item.total) * 100, 0) / d.attendance.length,
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {mockData.term} · {mockData.session}
        </p>
        <h2 style={{ margin: '4px 0 10px', fontSize: 26, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>
          {role === 'parent' ? `Viewing: ${d.name}` : `Welcome, ${d.name.split(' ')[0]}`}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <GoldBadge>{d.class}</GoldBadge>
          <GoldBadge>{d.level}</GoldBadge>
          <GoldBadge color='#9B9590'>Form Teacher: {d.formTeacher}</GoldBadge>
          <GoldBadge color={BLUE}>{d.house}</GoldBadge>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label='Fees Balance' value={`₦${(totalFeesDue / 1000).toFixed(0)}k`} sub='This term outstanding' color={RED} />
        <StatCard label='Avg CA Score' value='72%' sub='2nd Term CAs' color={GOLD} />
        <StatCard label='Attendance' value={`${avgAtt}%`} sub='This term' color={GREEN} />
        <StatCard label='Class Position' value={`${d.reportCard.position}th`} sub={`of ${d.reportCard.classSize} students`} color={BLUE} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Today's Timetable</CardLabel>
          {d.timetable.slice(0, 4).map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: index < 3 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#C9A02020', border: `1px solid #C9A02033`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#C9A020', fontFamily: 'monospace', lineHeight: 1 }}>{item.day}</span>
                <span style={{ fontSize: 10, color: '#0D0D0D', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.4 }}>{item.time.split(' ')[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590' }}>{item.teacher} · {item.room}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <CardLabel>2nd Term CA Scores</CardLabel>
          {d.subjects.slice(0, 5).map((subject, index) => {
            const total = subject.ca1 + subject.ca2
            const pct = Math.round((total / 40) * 100)
            const grade = getGrade(pct)
            return (
              <div key={index} style={{ padding: '7px 0', borderBottom: index < 4 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name}</p>
                  <span style={{ fontSize: 12, color: grade.color, fontWeight: 700, marginLeft: 8, fontFamily: 'monospace' }}>{total}/40 <span style={{ fontSize: 10 }}>{grade.grade}</span></span>
                </div>
                <div style={{ height: 4, background: BORDER, borderRadius: 2 }}>
                  <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: grade.color }} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

export function Subjects() {
  const subjects = mockData.student.subjects
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Subjects & Scores</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} · {mockData.session} · {mockData.student.class}</p>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <CardLabel>Score Breakdown — All Subjects</CardLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}`, background: '#FAFAF8' }}>
                {['Subject', 'Teacher', 'CA1 /20', 'CA2 /20', 'Mid-Term /40', 'Exam /100', 'Total /100', 'Grade'].map((header) => (
                  <th key={header} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#9B9590', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => {
                const caTotal = subject.ca1 + subject.ca2
                const composite = Math.round(((caTotal / 40) + (subject.midterm / 40)) * 50)
                const grade = getGrade(composite)
                return (
                  <tr key={index} style={{ borderBottom: `1px solid ${BORDER}`, background: index % 2 === 0 ? '#FAFAF8' : '#FFFFFF' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0D0D0D' }}>{subject.name}</td>
                    <td style={{ padding: '10px 10px', color: '#9B9590', fontSize: 12 }}>{subject.teacher}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.ca1}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.ca2}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.midterm}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', color: '#9B9590', fontSize: 12 }}>Pending</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, color: grade.color }}>{composite}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <span style={{ background: `${grade.color}18`, color: grade.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${grade.color}33` }}>{grade.grade}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardLabel>Nigerian Grading Scale (WAEC / NECO)</CardLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { range: '75–100', grade: 'A1', color: GOLD },
            { range: '70–74', grade: 'B2', color: GREEN },
            { range: '65–69', grade: 'B3', color: GREEN },
            { range: '60–64', grade: 'C4', color: BLUE },
            { range: '55–59', grade: 'C5', color: BLUE },
            { range: '50–54', grade: 'C6', color: BLUE },
            { range: '45–49', grade: 'D7', color: '#E8A020' },
            { range: '40–44', grade: 'E8', color: '#E8A020' },
            { range: '0–39', grade: 'F9', color: RED },
          ].map((item, index) => (
            <div key={index} style={{ background: `${item.color}12`, border: `1px solid ${item.color}33`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.grade}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: '#9B9590' }}>{item.range}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function Fees() {
  const fees = mockData.student.fees
  const feeItems: FeeItem[] = fees.structure.map((fee, index) => ({ id: index + 1, ...fee }))
  const [selectedFeeIds, setSelectedFeeIds] = useState<number[]>(feeItems.map((fee) => fee.id))
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paymentHistory, setPaymentHistory] = useState(fees.history)
  const [currentTermPaid, setCurrentTermPaid] = useState(50000)
  const totalDue = feeItems.reduce((sum, fee) => sum + fee.amount, 0)
  const totalPaid = paymentHistory.reduce((sum, fee) => sum + fee.amount, 0)
  const balance = Math.max(totalDue - currentTermPaid, 0)
  const selectedFees = feeItems.filter((fee) => selectedFeeIds.includes(fee.id))
  const selectedTotal = selectedFees.reduce((sum, fee) => sum + fee.amount, 0)

  const toggleFee = (id: number) => {
    setSelectedFeeIds((current) => (current.includes(id) ? current.filter((feeId) => feeId !== id) : [...current, id]))
  }

  const handlePaymentSuccess = (reference: string) => {
    const amountPaid = selectedTotal
    setPaymentHistory((current) => [
      {
        date: new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }),
        desc: `${mockData.term} Fees Payment`,
        amount: amountPaid,
        method: 'PayStack',
        ref: reference,
      },
      ...current,
    ])
    setCurrentTermPaid((current) => Math.min(current + amountPaid, totalDue))
    setSelectedFeeIds([])
    setPaymentNotice(`Payment successful. Reference: ${reference}`)
  }

  const handlePaymentError = (error: string) => {
    setPaymentNotice(error)
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>School Fees</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} / {mockData.session} / {mockData.student.class}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label='Total Due' value={`NGN ${(totalDue / 1000).toFixed(0)}k`} sub='This term' color={RED} />
        <StatCard label='Amount Paid' value={`NGN ${(totalPaid / 1000).toFixed(0)}k`} sub='All payments' color={GREEN} />
        <StatCard label='Balance' value={`NGN ${(balance / 1000).toFixed(0)}k`} sub='Outstanding' color={GOLD} />
      </div>
      {balance > 0 && (
        <div style={{ background: `${RED}10`, border: `1px solid ${RED}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: RED, fontWeight: 600 }}>Outstanding balance of NGN {balance.toLocaleString()} - Please complete payment to avoid disruption to academic activities.</p>
        </div>
      )}
      {paymentNotice && (
        <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#5C5750', fontWeight: 600 }}>{paymentNotice}</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <CardLabel>Fee Structure - {mockData.term}</CardLabel>
            <button
              onClick={() => setIsPaymentOpen(true)}
              disabled={selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0}
              style={{
                background: selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0 ? '#E8E4DC' : GOLD,
                border: 'none',
                color: '#0D0D0D',
                fontSize: 12,
                padding: '8px 16px',
                borderRadius: 7,
                cursor: selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Pay Now
            </button>
          </div>
          {feeItems.map((fee, index) => (
            <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: index < feeItems.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 13, color: '#0D0D0D', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={selectedFeeIds.includes(fee.id)}
                  onChange={() => toggleFee(fee.id)}
                  disabled={balance <= 0}
                  style={{ accentColor: GOLD, width: 15, height: 15 }}
                />
                {fee.label}
              </label>
              <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', fontFamily: 'monospace', fontWeight: 600 }}>NGN {fee.amount.toLocaleString()}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid ${GOLD}55`, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0D0D0D' }}>Selected Total</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#C9A020', fontFamily: 'monospace' }}>NGN {selectedTotal.toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <CardLabel>Payment History</CardLabel>
            <button style={{ background: 'transparent', border: `1px solid ${GOLD}66`, color: GOLD, fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Download</button>
          </div>
          {paymentHistory.map((item, index) => (
            <div key={index} style={{ padding: '10px 0', borderBottom: index < paymentHistory.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, color: '#0D0D0D', fontWeight: 500 }}>{item.desc}</p>
                  <p style={{ margin: '0 0 1px', fontSize: 11, color: '#9B9590' }}>{item.date} / {item.method}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#9B9590', fontFamily: 'monospace' }}>{item.ref}</p>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: GREEN, fontFamily: 'monospace', fontWeight: 700 }}>NGN {item.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <PayStackModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        selectedFees={selectedFees}
        totalAmount={selectedTotal}
        studentName={mockData.student.name}
        studentEmail='parent.okafor@example.com'
        studentId={mockData.student.id}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  )
}
export function Attendance() {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const att = mockData.student.attendance
  const totalPresent = att.reduce((sum, item) => sum + item.present, 0)
  const totalAbsent = att.reduce((sum, item) => sum + item.absent, 0)
  const totalLate = att.reduce((sum, item) => sum + item.late, 0)
  const overall = Math.round((totalPresent / att.reduce((sum, item) => sum + item.total, 0)) * 100)
  const calDays = Array.from({ length: 31 }, (_, index) => {
    if ([0, 6].includes(index % 7)) return 'weekend'
    const random = Math.random()
    return random > 0.88 ? 'absent' : random > 0.76 ? 'late' : 'present'
  })

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Attendance Record</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} · {mockData.session}</p>
      </div>
      {overall < 75 && (
        <div style={{ background: `${RED}10`, border: `1px solid ${RED}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: RED, fontWeight: 600 }}>⚠️ Attendance below 75% minimum. Students below this threshold may be barred from sitting examinations.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label='Overall' value={`${overall}%`} sub='Attendance rate' color={overall >= 75 ? GOLD : RED} />
        <StatCard label='Present' value={`${totalPresent}`} sub='Days attended' color={GREEN} />
        <StatCard label='Absent' value={`${totalAbsent}`} sub='Days missed' color={RED} />
        <StatCard label='Late' value={`${totalLate}`} sub='Late arrivals' color='#E8A020' />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['list', 'calendar'].map((item) => (
          <button
            key={item}
            onClick={() => setView(item as 'list' | 'calendar')}
            style={{
              padding: '7px 18px',
              borderRadius: 7,
              background: view === item ? GOLD : '#FFFFFF',
              border: `1px solid ${view === item ? GOLD : BORDER}`,
              color: view === item ? '#0D0D0D' : '#5C5750',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {item === 'list' ? 'By Subject' : 'Calendar View'}
          </button>
        ))}
      </div>
      {view === 'list' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {att.map((item, index) => {
            const pct = Math.round((item.present / item.total) * 100)
            return (
              <Card key={index} style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0D0D0D' }}>{item.subject}</p>
                  <span style={{ fontSize: 14, fontWeight: 700, color: pct >= 75 ? GREEN : RED, fontFamily: 'monospace' }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: BORDER, borderRadius: 3, marginBottom: 8 }}>
                  <div style={{ height: 5, borderRadius: 3, width: `${pct}%`, background: pct >= 75 ? GREEN : RED }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: GREEN }}>● Present: {item.present}</span>
                  <span style={{ fontSize: 12, color: RED }}>● Absent: {item.absent}</span>
                  <span style={{ fontSize: 12, color: '#E8A020' }}>● Late: {item.late}</span>
                  <span style={{ fontSize: 12, color: '#9B9590' }}>Total: {item.total} days</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardLabel>February 2026 — School Calendar</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => (
              <p key={day} style={{ margin: '0 0 6px', fontSize: 10, color: '#9B9590', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>{day}</p>
            ))}
            {calDays.map((status, index) => (
              <div
                key={index}
                style={{
                  height: 34,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  background: status === 'weekend' ? '#F0EFE8' : status === 'present' ? `${GREEN}18` : status === 'absent' ? `${RED}18` : '#E8A02018',
                  border: `1px solid ${status === 'weekend' ? BORDER : status === 'present' ? GREEN + '44' : status === 'absent' ? RED + '44' : '#E8A02044'}`,
                  color: status === 'weekend' ? '#9B9590' : status === 'present' ? GREEN : status === 'absent' ? RED : '#E8A020',
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            <span style={{ fontSize: 11, color: GREEN }}>■ Present</span>
            <span style={{ fontSize: 11, color: RED }}>■ Absent</span>
            <span style={{ fontSize: 11, color: '#E8A020' }}>■ Late</span>
            <span style={{ fontSize: 11, color: '#9B9590' }}>■ Weekend</span>
          </div>
        </Card>
      )}
    </div>
  )
}

export function ReportCard() {
  const d = mockData.student
  const rc = d.reportCard
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Report Card</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} · {mockData.session}</p>
        </div>
        <button style={{ background: '#C9A020', border: 'none', color: '#0D0D0D', fontSize: 12, padding: '8px 18px', borderRadius: 7, cursor: 'pointer', fontWeight: 700 }}>Print Report Card</button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <Avatar initials={d.avatar} size={56} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 6px', fontSize: 18, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>{d.name}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <GoldBadge>{d.class}</GoldBadge>
              <GoldBadge color='#9B9590'>{d.id}</GoldBadge>
              <GoldBadge color={BLUE}>{mockData.schoolName}</GoldBadge>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#C9A020', fontFamily: "'Georgia',serif" }}>{rc.position}<sup style={{ fontSize: 14 }}>th</sup></p>
            <p style={{ margin: 0, fontSize: 11, color: '#9B9590' }}>of {rc.classSize} students</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: GREEN }}>▲ Up from {rc.prevPosition}th last term</p>
          </div>
        </div>

        <CardLabel>Subject Performance</CardLabel>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BORDER}`, background: '#FAFAF8' }}>
              {['Subject', 'CA1', 'CA2', 'Mid-Term', 'Exam', 'Total', 'Grade', 'Remark'].map((header) => (
                <th key={header} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#9B9590', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.subjects.map((subject, index) => {
              const composite = Math.round(((subject.ca1 + subject.ca2) / 40 + subject.midterm / 40) * 50)
              const grade = getGrade(composite)
              return (
                <tr key={index} style={{ borderBottom: `1px solid ${BORDER}`, background: index % 2 === 0 ? '#FAFAF8' : '#FFFFFF' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 600, color: '#0D0D0D' }}>{subject.name}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'monospace', textAlign: 'center' }}>{subject.ca1}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'monospace', textAlign: 'center' }}>{subject.ca2}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'monospace', textAlign: 'center' }}>{subject.midterm}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center', color: '#9B9590', fontSize: 12 }}>—</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, color: grade.color }}>{composite}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                    <span style={{ background: `${grade.color}18`, color: grade.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${grade.color}33` }}>{grade.grade}</span>
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, color: grade.color }}>{grade.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardLabel>Form Teacher's Remark</CardLabel>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#0D0D0D', lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{rc.formTeacherRemark}&quot;</p>
          <p style={{ margin: 0, fontSize: 12, color: GOLD, fontWeight: 600 }}>— {d.formTeacher}</p>
        </Card>
        <Card>
          <CardLabel>Principal's Remark</CardLabel>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#0D0D0D', lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{rc.principalRemark}&quot;</p>
          <p style={{ margin: 0, fontSize: 12, color: GOLD, fontWeight: 600 }}>— Mr. Babatunde Afolabi, Principal</p>
        </Card>
      </div>
    </div>
  )
}

export function ParentSwitch({ activeChild, setActiveChild }: { activeChild: number; setActiveChild: (index: number) => void }) {
  const levelColor: Record<string, string> = { 'Senior Secondary': GOLD, 'Junior Secondary': BLUE, 'Primary School': GREEN }
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>My Children</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.schoolName} · {mockData.session}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {mockData.children.map((child, index) => (
          <div
            key={index}
            onClick={() => setActiveChild(index)}
            style={{
              background: '#FFFFFF',
              border: `2px solid ${activeChild === index ? GOLD : BORDER}`,
              borderRadius: 14,
              padding: '22px 18px',
              cursor: 'pointer',
              boxShadow: activeChild === index ? `0 4px 20px ${GOLD}22` : '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'all 0.2s',
            }}
          >
            <Avatar initials={child.avatar} size={48} />
            <p style={{ margin: '12px 0 3px', fontSize: 16, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>{child.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9B9590', fontFamily: 'monospace' }}>{child.id}</p>
            <GoldBadge color={levelColor[child.level] || GOLD}>{child.class}</GoldBadge>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#5C5750' }}>{child.level}</p>
            {activeChild === index && (
              <div style={{ marginTop: 12, padding: '6px 12px', background: `${GOLD}14`, borderRadius: 6, border: `1px solid ${GOLD}44` }}>
                <p style={{ margin: 0, fontSize: 11, color: GOLD, fontWeight: 700 }}>✓ CURRENTLY VIEWING</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <Card>
        <CardLabel>Quick Summary — {mockData.children[activeChild].name}</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <StatCard label='Class' value={mockData.children[activeChild].class} sub={mockData.children[activeChild].level} color={GOLD} />
          <StatCard label='Attendance' value='87%' sub='This term' color={GREEN} />
          <StatCard label='Fees Due' value='₦35k' sub='Balance' color={RED} />
          <StatCard label='Position' value='4th' sub='In class' color={BLUE} />
        </div>
      </Card>
    </div>
  )
}

