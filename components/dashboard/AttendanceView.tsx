'use client'

import Card from '@/components/ui/Card'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'

type AttendanceRecord = {
  week: string
  week_start_date?: string
  week_end_date?: string
  weekStart?: string
  weekEnd?: string
  status: 'present' | 'absent'
  days_present?: number
  daysPresent?: number
  school_days?: number
  schoolDays?: number
  teacher_notes?: string
  note?: string
}

export default function AttendanceView() {
  const { data: attendanceData } = useQuery<{ summary: AttendanceRecord[]; overall_pct: number }>({
    queryKey: ['portal-attendance', 'weekly'],
    queryFn: () => portalApi.getAttendance().then(r => r.data),
    placeholderData: { summary: [], overall_pct: 0 },
  })

  const attendanceRecords = attendanceData?.summary ?? []
  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#9B9590' }}>Attendance</p>
        <h2 style={{ margin: '10px 0 0', fontSize: 28, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>Weekly Attendance Summary</h2>
      </div>

      <Card>
        <div style={{ display: 'grid', gap: 14 }}>
          {attendanceRecords.map((item, index) => {
            const daysPresent = item.days_present ?? item.daysPresent ?? 0
            const schoolDays = item.school_days ?? item.schoolDays ?? 0
            const pct = schoolDays > 0 ? Math.round((daysPresent / schoolDays) * 100) : 0
            const weekStart = item.week_start_date ?? item.weekStart
            const weekEnd = item.week_end_date ?? item.weekEnd
            return (
            <div key={weekStart || index} style={{ display: 'grid', gap: 6, padding: 12, borderRadius: 14, background: index % 2 === 0 ? '#FAFAFA' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 700, color: '#0D0D0D' }}>{item.week}</span>
                <span style={{ color: item.status === 'present' ? '#1D9E75' : '#E24B4A', fontSize: 12, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
                <div style={{ padding: 12, borderRadius: 14, background: '#ECFDF5' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#065F46' }}>Present</p>
                  <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{daysPresent}</p>
                </div>
                <div style={{ padding: 12, borderRadius: 14, background: '#FEF2F2' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#991B1B' }}>Absent</p>
                  <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{Math.max(schoolDays - daysPresent, 0)}</p>
                </div>
                <div style={{ padding: 12, borderRadius: 14, background: '#EFF6FF' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#1D4ED8' }}>Week</p>
                  <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 12 }}>{formatDate(weekStart)} - {formatDate(weekEnd)}</p>
                </div>
              </div>
              {(item.teacher_notes || item.note) && <p style={{ margin: '4px 0 0', color: '#5C5750', fontSize: 12 }}>{item.teacher_notes || item.note}</p>}
            </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
