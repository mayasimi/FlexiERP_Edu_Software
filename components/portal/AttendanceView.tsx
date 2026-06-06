'use client'

import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'
import Card from '@/components/ui/Card'

export default function AttendanceView({ studentId }: { studentId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-attendance', studentId],
    queryFn:  () => portalApi.getAttendance(studentId).then(r => r.data),
    enabled:  true,
  })

  const attendanceRecords: any[] = data?.summary ?? []

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#9B9590' }}>Attendance</p>
        <h2 style={{ margin: '10px 0 0', fontSize: 28, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>Attendance Summary</h2>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
          {[
            { label: 'Overall',  value: `${data.overall_pct}%`,  color: data.overall_pct >= 75 ? '#10B981' : '#EF4444' },
            { label: 'Present',  value: data.present,            color: '#10B981' },
            { label: 'Absent',   value: data.absent,             color: '#EF4444' },
            { label: 'Late',     value: data.late,               color: '#F59E0B' },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</p>
              <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {data?.overall_pct < 75 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 18px' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
            ⚠️ Attendance below 75% minimum. Students may be barred from examinations.
          </p>
        </div>
      )}

      <Card>
        {isLoading ? (
          <p style={{ color: '#9B9590' }}>Loading attendance...</p>
        ) : attendanceRecords.length === 0 ? (
          <p style={{ color: '#9B9590', fontSize: 13 }}>No attendance records found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {attendanceRecords.map((item: any, index: number) => (
              <div key={index} style={{ display: 'grid', gap: 6, padding: 12, borderRadius: 14, background: index % 2 === 0 ? '#FAFAFA' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0D0D0D' }}>{item.subject}</span>
                  <span style={{ color: '#5C5750', fontSize: 12 }}>{item.present}/{item.total} present</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
                  <div style={{ padding: 12, borderRadius: 14, background: '#ECFDF5' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#065F46' }}>Present</p>
                    <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{item.present}</p>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, background: '#FEF2F2' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#991B1B' }}>Absent</p>
                    <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{item.absent}</p>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, background: '#FFF7ED' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9A3412' }}>Late</p>
                    <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{item.late}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
