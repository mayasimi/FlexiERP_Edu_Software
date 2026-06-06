'use client'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'

const GRADE_COLORS: Record<string, string> = {
  A1: '#10B981', B2: '#10B981', B3: '#22C55E',
  C4: '#C9A020', C5: '#C9A020', C6: '#EAB308',
  D7: '#F97316', E8: '#F97316', F9: '#EF4444',
}

const gradeColor = (grade: string) => GRADE_COLORS[grade] ?? '#6B6660'

const bar = (pct: number, color: string) => (
  <div style={{ height: 7, background: '#E8E4DC', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
  </div>
)

export default function SubjectsView({ studentId }: { studentId?: string }) {
  // subjects endpoint returns { term, available_terms, subjects }
  const { data: subjectsData, isLoading } = useQuery({
    queryKey:  ['portal-subjects', studentId],
    queryFn:   () => portalApi.getSubjects(studentId).then(r => r.data),
    enabled:   true,
  })
  // Normalise — handle both old array format and new object format
  const subjects: any[] = Array.isArray(subjectsData)
    ? subjectsData
    : (subjectsData?.subjects ?? [])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#9B9590', fontFamily: 'monospace' }}>
          Subjects & Scores
        </p>
        <h2 style={{ margin: '8px 0 0', fontSize: 28, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>
          Academic Results
        </h2>
      </div>

      {isLoading && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, padding: 24 }}>
          <p style={{ color: '#9B9590', fontSize: 13 }}>Loading results...</p>
        </div>
      )}

      {!isLoading && subjects.length === 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, padding: 24 }}>
          <p style={{ color: '#9B9590', fontSize: 13 }}>No result records found yet for this term.</p>
        </div>
      )}

      {!isLoading && subjects.length > 0 && (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12 }}>
            {[
              { label: 'Subjects',    value: subjects.length,                                                                     color: '#0D0D0D' },
              { label: 'Avg Score',   value: `${Math.round(subjects.reduce((s: number, x: any) => s + (x.pct ?? 0), 0) / subjects.length)}%`, color: '#C9A020' },
              { label: 'Highest',     value: `${Math.max(...subjects.map((x: any) => x.pct ?? 0))}%`,                            color: '#10B981' },
              { label: 'Needs Work',  value: subjects.filter((x: any) => (x.pct ?? 0) < 50).length,                              color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 12, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace' }}>{label}</p>
                <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Full result table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E4DC' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Subject Breakdown</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9B9590' }}>CA scores + exam scores from your teachers</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F7F6F3' }}>
                    {['Subject', 'Teacher', 'CA 1', 'CA 2', 'Exam', 'Total', '%', 'Grade', 'Remark'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B6660', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid #E8E4DC', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((item: any, i: number) => {
                    const color = gradeColor(item.grade)
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F0EDE8' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13 }}>{item.subject}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B6660' }}>{item.teacher}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{item.ca1 ?? '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{item.ca2 ?? '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{item.midterm ?? '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>
                          {item.total}/{item.total_max}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color }}>
                          <strong>{item.pct}%</strong>
                          {bar(item.pct, color)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: `${color}16`, color, fontSize: 12, fontWeight: 800, border: `1px solid ${color}33` }}>
                            {item.grade}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B6660' }}>{item.remark ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grade key */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, padding: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9B9590', textTransform: 'uppercase', letterSpacing: 1 }}>Grade Key</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { grade: 'A1', range: '75–100', remark: 'Excellent'  },
                { grade: 'B2', range: '70–74',  remark: 'Very Good'  },
                { grade: 'B3', range: '65–69',  remark: 'Good'       },
                { grade: 'C4', range: '60–64',  remark: 'Credit'     },
                { grade: 'C5', range: '55–59',  remark: 'Credit'     },
                { grade: 'C6', range: '50–54',  remark: 'Credit'     },
                { grade: 'D7', range: '45–49',  remark: 'Pass'       },
                { grade: 'E8', range: '40–44',  remark: 'Pass'       },
                { grade: 'F9', range: '0–39',   remark: 'Fail'       },
              ].map(({ grade, range, remark }) => {
                const c = gradeColor(grade)
                return (
                  <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: `${c}10`, border: `1px solid ${c}22` }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{grade}</span>
                    <span style={{ fontSize: 11, color: '#6B6660' }}>{range} — {remark}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
