'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Printer, ChevronDown } from 'lucide-react'
import { portalApi } from '@/lib/api'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { useAuthStore } from '@/lib/auth-store'

// ── Types ──────────────────────────────────────────────────────────────────
interface CaRow   { id: number; title: string; max: number; score: number | null }
interface Subject {
  subject:    string
  teacher:    string
  ca_rows:    CaRow[]
  ca_total:   number
  ca_max:     number
  midterm:    number | null   // exam score
  exam_max:   number
  exam_title: string
  total:      number
  total_max:  number
  pct:        number
  grade:      string
  color:      string
  remark:     string
  // legacy compat
  ca1?: number | null; ca1_max?: number; ca1_title?: string
  ca2?: number | null; ca2_max?: number; ca2_title?: string
}
interface SubjectsResponse {
  term:            string | null
  available_terms: string[]
  subjects:        Subject[]
}
interface DashboardData {
  student: { name: string; first_name: string; class_section: string; level: string; admission_no: string; house: string; form_teacher: string; avatar: string }
  stats:   { attendance_pct: number; position: number; class_size: number }
  term:    string
  session: string
}

const GRADE_COLORS: Record<string, string> = {
  A1: '#10B981', B2: '#10B981', B3: '#22C55E',
  C4: '#C9A020', C5: '#C9A020', C6: '#EAB308',
  D7: '#F97316', E8: '#F97316', F9: '#EF4444',
}
const gc = (g: string) => GRADE_COLORS[g] ?? '#6B6660'

const GRADING = [
  { grade: 'A1', range: '75–100', remark: 'Excellent' },
  { grade: 'B2', range: '70–74',  remark: 'Very Good' },
  { grade: 'B3', range: '65–69',  remark: 'Good'      },
  { grade: 'C4', range: '60–64',  remark: 'Credit'    },
  { grade: 'C5', range: '55–59',  remark: 'Credit'    },
  { grade: 'C6', range: '50–54',  remark: 'Credit'    },
  { grade: 'D7', range: '45–49',  remark: 'Pass'      },
  { grade: 'E8', range: '40–44',  remark: 'Pass'      },
  { grade: 'F9', range: '0–39',   remark: 'Fail'      },
]

function ordinal(n: number) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

// ── ReportCard component ────────────────────────────────────────────────────
export function ReportCard({ studentId }: { studentId?: string }) {
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  // Fetch dashboard (student info, stats)
  const { data: dash, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['portal-dashboard', studentId],
    queryFn:  () => portalApi.getDashboard(studentId).then(r => r.data),
  })

  // Fetch subjects — now returns { term, available_terms, subjects }
  // Pass selected term as query param so backend filters by term
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery<SubjectsResponse>({
    queryKey:  ['portal-subjects-rc', studentId, selectedTerm],
    queryFn:   () => portalApi.getSubjects(studentId, selectedTerm || undefined).then(r => r.data),
    enabled:   true,
  })

  const isLoading      = dashLoading || subjectsLoading
  const student        = dash?.student
  const stats          = dash?.stats
  const session        = dash?.session ?? '—'
  // Normalise response — handles both old array format and new object format
  const subjects: Subject[] = Array.isArray(subjectsData)
    ? (subjectsData as unknown as Subject[])
    : (subjectsData?.subjects ?? [])
  const availableTerms: string[] = Array.isArray(subjectsData)
    ? []
    : (subjectsData?.available_terms ?? [])
  const activeTerm: string = Array.isArray(subjectsData)
    ? (selectedTerm || '—')
    : (subjectsData?.term ?? selectedTerm ?? '—')

  // Build dynamic CA column headers from first subject's ca_rows
  const caHeaders: string[] = subjects[0]?.ca_rows?.map((r, i) => r.title || `CA ${i + 1}`) ?? ['CA 1', 'CA 2']

  // Grand totals
  const grandTotal = subjects.reduce((s, x) => s + x.total,     0)
  const grandMax   = subjects.reduce((s, x) => s + x.total_max, 0)
  const grandPct   = grandMax > 0 ? Math.round((grandTotal / grandMax) * 1000) / 10 : 0
  const grandGrade = (() => {
    const e = GRADING.find(g => { const [lo, hi] = g.range.split('–').map(Number); return grandPct >= lo && grandPct <= hi })
    return e?.grade ?? 'F9'
  })()

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9B9590' }}>Loading report card...</div>
  if (!student)  return <div style={{ padding: 40, textAlign: 'center', color: '#9B9590' }}>Student record not found.</div>

  return (
    <>
      {/* ── Term selector + print button — hidden on print ──────────────── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6B6660', textTransform: 'uppercase', letterSpacing: 0.8 }}>Term:</label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedTerm || activeTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              style={{ appearance: 'none', padding: '8px 32px 8px 12px', borderRadius: 8, border: '1px solid #E8E4DC', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0D0D0D', cursor: 'pointer', minWidth: 160 }}
            >
              {availableTerms.length === 0 && <option value="">{activeTerm}</option>}
              {availableTerms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B6660' }} />
          </div>
          <span style={{ fontSize: 12, color: '#9B9590' }}>Session: <strong style={{ color: '#0D0D0D' }}>{session}</strong></span>
        </div>
        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: '#0D0D0D', color: '#FFFFFF', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Printer size={14} /> Print Report Card
        </button>
      </div>

      {/* ── Report card document ─────────────────────────────────────────── */}
      <div id="report-card-doc" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8E4DC', maxWidth: 900, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: 40 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, marginBottom: 24, borderBottom: '2px solid #E8E4DC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(201,160,32,0.12)', border: '2px solid rgba(201,160,32,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={28} color="#C9A020" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0D0D0D' }}>FlexiSoftware School</h2>
                <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#C9A020' }}>Student Report Card</p>
                <div style={{ width: 40, height: 2, background: '#C9A020', borderRadius: 2, marginTop: 5 }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: '#6B6660', lineHeight: 1.8 }}>
              <div>Term: <strong style={{ color: '#0D0D0D' }}>{activeTerm}</strong></div>
              <div>Session: <strong style={{ color: '#0D0D0D' }}>{session}</strong></div>
              <div>Class: <strong style={{ color: '#0D0D0D' }}>{student.class_section}</strong></div>
            </div>
          </div>

          {/* Student info */}
          <div style={{ borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #E8E4DC', borderLeft: '4px solid #C9A020' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
              {[
                { label: 'Student Name',   value: student.name,         bold: true  },
                { label: 'Admission No',   value: student.admission_no              },
                { label: 'Class',          value: student.class_section             },
                { label: 'Level',          value: student.level                     },
                { label: 'House',          value: student.house !== '—' ? student.house : '—' },
                { label: 'Form Teacher',   value: student.form_teacher              },
                { label: 'Attendance',     value: `${stats?.attendance_pct ?? '—'}%`, color: '#10B981', bold: true },
                { label: 'Class Position', value: stats?.position ? `${stats.position}${ordinal(stats.position)} of ${stats.class_size}` : '—', color: '#C9A020', bold: true },
              ].map(({ label, value, bold, color }) => (
                <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: '#9B9590', width: 130, flexShrink: 0 }}>{label}:</span>
                  <span style={{ fontWeight: bold ? 700 : 500, color: color ?? '#0D0D0D' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Results table */}
          {subjects.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9B9590', border: '1px solid #E8E4DC', borderRadius: 12, marginBottom: 24 }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0D0D0D' }}>No results for {activeTerm}</p>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                {availableTerms.length > 1
                  ? 'Try selecting a different term from the dropdown above.'
                  : 'Results have not been entered yet for this term.'}
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid #E8E4DC' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F7F6F3' }}>
                      {/* Subject + teacher */}
                      <th style={thStyle('left', 160)}>Subject</th>
                      {/* Dynamic CA columns */}
                      {caHeaders.map((h, i) => (
                        <th key={i} style={thStyle('center', 80)} title={h}>{`CA ${i + 1}`}</th>
                      ))}
                      <th style={thStyle('center', 80)}>Exam</th>
                      <th style={thStyle('center', 80)}>Total</th>
                      <th style={thStyle('center', 60)}>%</th>
                      <th style={thStyle('center', 60)}>Grade</th>
                      <th style={thStyle('left')}>Remark</th>
                    </tr>
                    {/* Sub-header: show max marks */}
                    <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E4DC' }}>
                      <td style={{ padding: '4px 12px', fontSize: 10, color: '#9B9590' }}>Max marks →</td>
                      {(subjects[0]?.ca_rows ?? []).map((r, i) => (
                        <td key={i} style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#9B9590' }}>{r.max}</td>
                      ))}
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#9B9590' }}>{subjects[0]?.exam_max ?? 0}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#9B9590' }}>{subjects[0]?.total_max ?? 0}</td>
                      <td colSpan={3} />
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => {
                      const color = gc(s.grade)
                      // Use ca_rows if available (new format), else fall back to ca1/ca2
                      const caRows = s.ca_rows && s.ca_rows.length > 0
                        ? s.ca_rows
                        : [
                            { score: s.ca1 ?? null, max: s.ca1_max ?? 0 },
                            { score: s.ca2 ?? null, max: s.ca2_max ?? 0 },
                          ]
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F0EDE8' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{s.subject}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9B9590' }}>{s.teacher}</p>
                          </td>
                          {caRows.map((r: any, j: number) => (
                            <td key={j} style={{ padding: '10px 8px', textAlign: 'center', color: '#0D0D0D' }}>
                              {r.score !== null && r.score !== undefined ? r.score : <span style={{ color: '#C9C4BC' }}>—</span>}
                            </td>
                          ))}
                          <td style={{ padding: '10px 8px', textAlign: 'center', color: '#0D0D0D' }}>
                            {s.midterm !== null ? s.midterm : <span style={{ color: '#C9C4BC' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color }}>{s.pct}%</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: `${color}16`, color, fontSize: 11, fontWeight: 800, border: `1px solid ${color}33` }}>
                              {s.grade}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: '#6B6660' }}>{s.remark || '—'}</td>
                        </tr>
                      )
                    })}
                    {/* Grand total */}
                    <tr style={{ background: '#C9A020' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#FFFFFF', fontSize: 13 }}>GRAND TOTAL</td>
                      {caHeaders.map((_, i) => (
                        <td key={i} style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>—</td>
                      ))}
                      <td style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>—</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: '#FFFFFF', fontSize: 13 }}>{grandTotal}/{grandMax}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: '#FFFFFF', fontSize: 13 }}>{grandPct}%</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: '#FFFFFF', fontSize: 13 }}>{grandGrade}</td>
                      <td style={{ padding: '12px', color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                        {stats?.position ? `${stats.position}${ordinal(stats.position)} of ${stats.class_size}` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grading scale */}
          <div style={{ borderRadius: 12, padding: 14, marginBottom: 24, border: '1px solid #E8E4DC', background: 'rgba(201,160,32,0.03)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#C9A020' }}>Grading Scale</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GRADING.map(({ grade, range, remark }) => {
                const c = gc(grade)
                return (
                  <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 8, background: `${c}10`, border: `1px solid ${c}22` }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{grade}</span>
                    <span style={{ fontSize: 10, color: '#6B6660' }}>{range} — {remark}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Remark + signatures */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#C9A020' }}>Form Teacher's Remarks</p>
            <p style={{ margin: '0 0 24px', fontSize: 13, fontStyle: 'italic', color: '#0D0D0D', padding: '10px 14px', background: '#F7F6F3', borderRadius: 8, border: '1px solid #E8E4DC' }}>
              {(stats?.attendance_pct ?? 100) >= 75
                ? 'Good academic performance. Keep up the excellent work.'
                : 'Attendance needs improvement. Please ensure regular attendance to maximise performance.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'end' }}>
              <div>
                <div style={{ height: 1, background: '#E8E4DC', marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9B9590', textAlign: 'center' }}>
                  {student.form_teacher !== '—' ? student.form_teacher : 'Class Teacher'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 10, border: '2px dashed #C9A020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A020', fontSize: 8, fontWeight: 700, letterSpacing: 1, textAlign: 'center', lineHeight: 1.4 }}>
                  OFFICIAL<br />SEAL
                </div>
              </div>
              <div>
                <div style={{ height: 1, background: '#E8E4DC', marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9B9590', textAlign: 'center' }}>Principal</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #E8E4DC', fontSize: 11, color: '#9B9590' }}>
            <span>Date of Issue: <strong style={{ color: '#C9A020' }}>{new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#C9A020' }}>Generated by FlexiSoftware ERP</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print, .sidebar, button, nav, header { display: none !important; }
          #report-card-doc { box-shadow: none !important; border: none !important; max-width: 100% !important; }
          body { background: white !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </>
  )
}


// ── Admin Report Card View ─────────────────────────────────────────────────
// Lets admin pick class → section → student → term, then renders the same
// ReportCard component used by the student portal.
function AdminReportCardView() {
  const { data: classes = [] } = useQuery({
    queryKey: ['admin-rc-classes'],
    queryFn:  () => import('@/lib/api').then(m => m.academicsApi.getClasses()).then(r => r.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['admin-rc-students'],
    queryFn:  () => import('@/lib/api').then(m => m.studentApi.list({ per_page: 500 })).then(r => r.data.data),
  })

  const [selectedSectionId, setSelectedSectionId] = React.useState('')
  const [selectedStudentId, setSelectedStudentId] = React.useState('')
  const [loaded, setLoaded] = React.useState(false)

  const allSections = classes.flatMap((c: any) =>
    (c.sections ?? []).map((s: any) => ({ ...s, class_name: c.name }))
  )

  const studentsInSection = students.filter((s: any) =>
    !selectedSectionId || String(s.section_id) === String(selectedSectionId)
  )

  const handleLoad = () => {
    if (!selectedStudentId) return
    setLoaded(true)
  }

  return (
    <>
      {/* Filter bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6660', marginBottom: 6 }}>Class / Section</label>
          <select value={selectedSectionId} onChange={e => { setSelectedSectionId(e.target.value); setSelectedStudentId(''); setLoaded(false) }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 13, minWidth: 180 }}>
            <option value="">All Sections</option>
            {allSections.map((s: any) => (
              <option key={s.id} value={s.id}>{s.class_name} — {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6660', marginBottom: 6 }}>Student</label>
          <select value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); setLoaded(false) }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 13, minWidth: 220 }}>
            <option value="">Select Student</option>
            {studentsInSection.map((s: any) => (
              <option key={s.db_id ?? s.id} value={String(s.db_id ?? s.id)}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleLoad} disabled={!selectedStudentId}
          style={{ padding: '9px 20px', borderRadius: 9, background: selectedStudentId ? '#C9A020' : '#E8E4DC', color: selectedStudentId ? '#FFFFFF' : '#9B9590', fontWeight: 700, fontSize: 13, border: 'none', cursor: selectedStudentId ? 'pointer' : 'not-allowed' }}>
          Load Report Card
        </button>
      </div>

      {/* Report card — uses same component as portal */}
      {loaded && selectedStudentId ? (
        <ReportCard studentId={selectedStudentId} />
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 14, padding: 48, textAlign: 'center', color: '#9B9590' }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ margin: 0, fontWeight: 600, color: '#0D0D0D' }}>Select a student above to load their report card</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>Class sections and students are loaded from the database.</p>
        </div>
      )}
    </>
  )
}

// ── Standalone page ────────────────────────────────────────────────────────
export default function ReportCardPage() {
  const { role } = useAuthStore()

  if (role === 'student' || role === 'parent') {
    return (
      <AppLayout>
        <div style={{ padding: '24px 24px 40px' }}>
          <ReportCard />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Topbar title="Report Card" />
      <div style={{ padding: '24px 24px 40px' }}>
        <AdminReportCardView />
      </div>
    </AppLayout>
  )
}

// ── Style helper ──────────────────────────────────────────────────────────
function thStyle(align: 'left' | 'center', width?: number): React.CSSProperties {
  return {
    padding: '10px 8px',
    textAlign: align,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#6B6660',
    borderBottom: '1px solid #E8E4DC',
    whiteSpace: 'nowrap',
    ...(width ? { width } : {}),
  }
}
