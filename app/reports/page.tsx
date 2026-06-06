'use client'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { reportApi } from '@/lib/api'
import { useEffect, useMemo, useState } from 'react'
import { BarChart2, Download, X } from 'lucide-react'
import { getClassLevelsFromDirectory } from '@/lib/utils'

type PieSegment = { label: string; value: number; color: string }

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function pieWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

function PieChart({ segments }: { segments: PieSegment[] }) {
  const safeSegments = segments.filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = safeSegments.reduce((sum, s) => sum + s.value, 0)
  const cx = 18
  const cy = 18
  const r = 16
  let angle = 0

  return (
    <svg viewBox="0 0 36 36" className="w-32 h-32">
      {total <= 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="#E4E1D8" />
      ) : (
        safeSegments.map((s) => {
          const sweep = (s.value / total) * 360
          const startAngle = angle
          const endAngle = angle + sweep
          angle = endAngle
          return <path key={s.label} d={pieWedgePath(cx, cy, r, startAngle, endAngle)} fill={s.color} />
        })
      )}
      <circle cx={cx} cy={cy} r={8.2} fill="white" />
    </svg>
  )
}

function normalizeClassFromGrade(value: string) {
  const m = String(value).match(/(\d+)/)
  return m ? `Grade ${m[1]}` : String(value)
}

const MOCK_ANALYTICS = {
  enrollment: [
    { q: 'Q1', current: 1200, prev: 900 },
    { q: 'Q2', current: 1800, prev: 1400 },
    { q: 'Q3', current: 3200, prev: 2000 },
    { q: 'Q4', current: 3600, prev: 2400 },
  ],
  fee_collected_pct: 82,
  top_performers: [
    { name: 'Eleanor Vance', grade: '12th Grade', score: 98.5 },
    { name: 'Luke Crain', grade: '11th Grade', score: 97.2 },
    { name: 'Theodora Crain', grade: '10th Grade', score: 96.8 },
    { name: 'Shirley Crain', grade: '12th Grade', score: 95.0 },
  ],
  student_staff_ratio: '1:24',
  attendance: { students: 94, faculty: 98, support: 92 },
}

export default function ReportsPage() {
  const { data = MOCK_ANALYTICS } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => reportApi.getAnalytics().then(r => r.data),
    placeholderData: MOCK_ANALYTICS,
  })

  const [format, setFormat] = useState('Comprehensive PDF')
  const [dateFrom, setDateFrom] = useState('2023-10-01')
  const [dateTo, setDateTo] = useState('2023-10-31')
  const [modules, setModules] = useState({ enrollment: true, financial: true, academic: true })

  const maxVal = Math.max(...data.enrollment.map((d: typeof MOCK_ANALYTICS['enrollment'][0]) => Math.max(d.current, d.prev)))
  const ratioMatch = String(data.student_staff_ratio).match(/(\d+)\s*:\s*(\d+)/)
  const ratioLeft = ratioMatch ? Number(ratioMatch[1]) : 1
  const ratioRight = ratioMatch ? Number(ratioMatch[2]) : 24

  const [hasMounted, setHasMounted] = useState(false)
  const [classLevels, setClassLevels] = useState<string[]>(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
  useEffect(() => setHasMounted(true), [])
  useEffect(() => {
    if (!hasMounted) return
    setClassLevels(getClassLevelsFromDirectory(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']))
  }, [hasMounted])

  const [showTopPerformers, setShowTopPerformers] = useState(false)
  const performers = (data.top_performers ?? []) as Array<typeof MOCK_ANALYTICS['top_performers'][0]>
  const classOptions = useMemo(() => {
    const base = Array.from(new Set(performers.map((p) => normalizeClassFromGrade(p.grade))))
    const fallback = classLevels.length ? classLevels : ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
    const list = base.length ? base : fallback
    return list.sort((a, b) => {
      const an = Number(a.match(/(\d+)/)?.[1] ?? 0)
      const bn = Number(b.match(/(\d+)/)?.[1] ?? 0)
      return an - bn
    })
  }, [classLevels, performers])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const filteredPerformers = useMemo(() => {
    const list = selectedClass
      ? performers.filter((p) => normalizeClassFromGrade(p.grade) === selectedClass)
      : performers
    return [...list].sort((a, b) => b.score - a.score)
  }, [performers, selectedClass])
  const topStudent = filteredPerformers[0] ?? null

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Reporting & Analytics</h1>
        <p className="page-subtitle">Institutional performance at a glance.</p>
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Charts Area (3 cols) */}
          <div className="xl:col-span-3 space-y-4">
            {/* Row 1: Enrollment + Fee */}
            <div className="grid grid-cols-2 gap-4 animate-in stagger-1">
              {/* Enrollment Trends */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Enrollment Trends</h3>
                  <button className="p-1.5 rounded hover:bg-gray-100"><BarChart2 size={15} style={{ color: '#6B6660' }} /></button>
                </div>
                {/* Bar Chart */}
                <div className="relative h-40">
                  <div className="flex items-end justify-around h-full gap-4 pb-6">
                    {data.enrollment.map((d: typeof MOCK_ANALYTICS['enrollment'][0]) => (
                      <div key={d.q} className="flex flex-col items-center gap-1 flex-1">
                        <div className="flex gap-1 items-end w-full justify-center">
                          <div className="w-4 rounded-t-md transition-all"
                               style={{ height: `${(d.prev / maxVal) * 100}px`, background: '#E4E1D8' }} />
                          <div className="w-4 rounded-t-md transition-all"
                               style={{ height: `${(d.current / maxVal) * 100}px`, background: '#C9A020' }} />
                        </div>
                        <span className="text-xs" style={{ color: '#6B6660' }}>{d.q}</span>
                      </div>
                    ))}
                  </div>
                  {/* Y axis labels */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between">
                    {['4k','3k','2k','1k','0'].map(v => (
                      <span key={v} className="text-xs" style={{ color: '#A09080' }}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fee Collection */}
              <div className="card flex flex-col items-center justify-center">
                <h3 className="font-bold mb-4 self-start">Fee Collection</h3>
                <div className="relative w-32 h-32 mb-4">
                  <PieChart
                    segments={[
                      { label: 'Collected', value: data.fee_collected_pct, color: '#C9A020' },
                      { label: 'Pending', value: Math.max(0, 100 - data.fee_collected_pct), color: '#0D0D0D' },
                    ]}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{data.fee_collected_pct}%</span>
                    <span className="text-xs" style={{ color: '#6B6660' }}>Collected</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#C9A020' }} /> Collected
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#0D0D0D' }} /> Pending
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Top Performers + Ratio + Attendance */}
            <div className="grid grid-cols-3 gap-4 animate-in stagger-2">
              {/* Top Performers */}
              <div className="card col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Top Performers</h3>
                  <button
                    type="button"
                    className="text-xs"
                    style={{ color: '#C9A020' }}
                    onClick={() => {
                      setSelectedClass((prev) => prev || classOptions[classOptions.length - 1] || 'Grade 12')
                      setShowTopPerformers(true)
                    }}
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-0">
                  <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider pb-2 border-b mb-2" style={{ color: '#6B6660', borderColor: '#E4E1D8' }}>
                    <span>Student</span><span>Grade</span><span>Score</span>
                  </div>
                  {data.top_performers.map((p: typeof MOCK_ANALYTICS['top_performers'][0], i: number) => (
                    <div key={p.name} className={`grid grid-cols-3 text-sm py-2.5 ${i < data.top_performers.length - 1 ? 'border-b' : ''}`}
                         style={{ borderColor: '#E4E1D8' }}>
                      <span className="font-medium truncate">{p.name}</span>
                      <span style={{ color: '#6B6660' }}>{p.grade}</span>
                      <span className="font-bold" style={{ color: i === 0 ? '#C9A020' : '#0D0D0D' }}>{p.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student/Staff Ratio */}
              <div className="card flex flex-col items-center justify-center text-center">
                <h3 className="font-bold mb-4 self-start">Student/Staff Ratio</h3>
                <div className="flex flex-col items-center justify-center">
                  <PieChart
                    segments={[
                      { label: 'Students', value: ratioRight, color: '#C9A020' },
                      { label: 'Staff', value: ratioLeft, color: '#0D0D0D' },
                    ]}
                  />
                </div>
                <p className="text-3xl font-bold mt-2">{data.student_staff_ratio}</p>
                <div className="flex gap-4 text-sm mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#C9A020' }} /> Students
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#0D0D0D' }} /> Staff
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="card">
                <h3 className="font-bold mb-4">Attendance</h3>
                <div className="relative h-40">
                  <div className="flex items-end justify-around h-full gap-4 pb-6">
                    {[
                      { label: 'Students', pct: data.attendance.students },
                      { label: 'Faculty', pct: data.attendance.faculty },
                      { label: 'Support', pct: data.attendance.support },
                    ].map(({ label, pct }) => (
                      <div key={label} className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-10 rounded-t-md transition-all" style={{ height: `${Math.max(0, Math.min(100, pct))}px`, background: '#C9A020' }} />
                        <span className="text-xs" style={{ color: '#6B6660' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between">
                    {['100%','75%','50%','25%','0%'].map(v => (
                      <span key={v} className="text-xs" style={{ color: '#A09080' }}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Builder */}
          <div className="card animate-in stagger-3 h-fit">
            <h3 className="font-bold mb-1">Report Builder</h3>
            <p className="text-xs mb-4" style={{ color: '#6B6660' }}>Configure export parameters.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Report Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)} className="select">
                  <option>Comprehensive PDF</option>
                  <option>Excel Spreadsheet</option>
                  <option>CSV Export</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Date Range</label>
                <div className="flex gap-1.5">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-xs" />
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6660' }}>Include Modules</label>
                <div className="space-y-2">
                  {[
                    { key: 'enrollment', label: 'Enrollment Metrics' },
                    { key: 'financial', label: 'Financial Summaries' },
                    { key: 'academic', label: 'Academic Performance' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox"
                             checked={modules[key as keyof typeof modules]}
                             onChange={e => setModules(prev => ({ ...prev, [key]: e.target.checked }))}
                             className="w-4 h-4 rounded" style={{ accentColor: '#C9A020' }} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn-gold w-full flex items-center justify-center gap-2">
                <BarChart2 size={14} /> Generate Report
              </button>
              <button className="btn-outline w-full flex items-center justify-center gap-2">
                <Download size={14} /> Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTopPerformers ? (
        <div className="fixed inset-0 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 80 }}>
          <div className="min-h-full flex items-start justify-center px-4 py-6">
            <div className="card w-full max-w-3xl animate-in" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-lg">Top Performers (View All)</h2>
                  <p className="text-xs" style={{ color: '#6B6660' }}>Query by class and view the top student for that class.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopPerformers(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="label">Class</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="select">
                    {classOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <div className="mt-4 rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6660' }}>Top Student</div>
                    {topStudent ? (
                      <div>
                        <div className="font-bold">{topStudent.name}</div>
                        <div className="text-sm" style={{ color: '#6B6660' }}>{normalizeClassFromGrade(topStudent.grade)}</div>
                        <div className="text-2xl font-bold mt-2" style={{ color: '#C9A020' }}>{topStudent.score}%</div>
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: '#6B6660' }}>No records for this class.</div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E4E1D8' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#E4E1D8', background: '#FFFFFF' }}>
                      <div className="font-semibold">Ranking</div>
                      <div className="text-xs" style={{ color: '#6B6660' }}>Sorted by score (highest first)</div>
                    </div>
                    <div className="px-4 py-3" style={{ background: '#FFFFFF' }}>
                      {filteredPerformers.length ? (
                        <div className="overflow-x-auto">
                          <div className="space-y-0 min-w-[520px]">
                            <div className="grid grid-cols-4 text-xs font-semibold uppercase tracking-wider pb-2 border-b mb-2" style={{ color: '#6B6660', borderColor: '#E4E1D8' }}>
                              <span>#</span><span>Student</span><span>Class</span><span>Score</span>
                            </div>
                            {filteredPerformers.slice(0, 20).map((p, idx) => (
                              <div
                                key={`${p.name}-${p.grade}-${p.score}-${idx}`}
                                className={`grid grid-cols-4 text-sm py-2.5 ${idx < Math.min(filteredPerformers.length, 20) - 1 ? 'border-b' : ''}`}
                                style={{ borderColor: '#E4E1D8' }}
                              >
                                <span style={{ color: '#6B6660' }}>{idx + 1}</span>
                                <span className="font-medium truncate">{p.name}</span>
                                <span style={{ color: '#6B6660' }}>{normalizeClassFromGrade(p.grade)}</span>
                                <span className="font-bold" style={{ color: idx === 0 ? '#C9A020' : '#0D0D0D' }}>{p.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm" style={{ color: '#6B6660' }}>No performers available.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowTopPerformers(false)} className="btn-outline px-8">Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
