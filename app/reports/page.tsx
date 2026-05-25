'use client'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { reportApi } from '@/lib/api'
import { adminMockViews } from '@/lib/admin-mock-db'
import { useState, useMemo } from 'react'
import { BarChart2, Download, Filter, X, Award, TrendingUp, User } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_ANALYTICS = adminMockViews.reports
type TopPerformer = {
  id: string
  name: string
  grade: string
  section: string
  score: number
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
  
  // Top Performers State
  const [showTopPerformersModal, setShowTopPerformersModal] = useState(false)
  const [performerGradeFilter, setPerformerGradeFilter] = useState('All Grades')

  const filteredPerformers = useMemo<TopPerformer[]>(() => {
    const all = data.top_performers as unknown as TopPerformer[]
    return all.filter((p) => performerGradeFilter === 'All Grades' || p.grade === performerGradeFilter)
  }, [data.top_performers, performerGradeFilter])

  const maxVal = Math.max(...data.enrollment.map((d: typeof MOCK_ANALYTICS['enrollment'][0]) => Math.max(d.current, d.prev)))

  const handleGenerateReport = () => {
    toast.success(`Generating ${format} for ${Object.keys(modules).filter(k => modules[k as keyof typeof modules]).join(', ')}...`)
  }
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
                  <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0D0D0D" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#C9A020" strokeWidth="4"
                            strokeDasharray={`${data.fee_collected_pct} ${100 - data.fee_collected_pct}`}
                            strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{data.fee_collected_pct}%</span>
                    <span className="text-xs" style={{ color: '#6B6660' }}>Collected</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#0D0D0D' }} /> Paid
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#C9A020' }} /> Pending
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
                  <button onClick={() => setShowTopPerformersModal(true)} className="text-xs font-semibold hover:underline" style={{ color: '#C9A020' }}>
                    View All
                  </button>
                </div>
                <div className="space-y-0">
                  <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider pb-2 border-b mb-2" style={{ color: '#6B6660', borderColor: '#E4E1D8' }}>
                    <span>Student</span><span>Grade</span><span>Score</span>
                  </div>
                  {data.top_performers.slice(0, 4).map((p: any, i: number) => (
                    <div key={p.id} className={`grid grid-cols-3 text-sm py-2.5 ${i < 3 ? 'border-b' : ''}`}
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
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                     style={{ background: 'linear-gradient(135deg, #0D0D0D 60%, #C9A020)', position: 'relative' }}>
                  <div className="w-16 h-16 rounded-full bg-white" />
                </div>
                <p className="text-3xl font-bold">{data.student_staff_ratio}</p>
                <p className="text-xs mt-1" style={{ color: '#6B6660' }}>Optimal is 1:20</p>
              </div>

              {/* Attendance */}
              <div className="card">
                <h3 className="font-bold mb-4">Attendance</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Students', pct: data.attendance.students },
                    { label: 'Faculty', pct: data.attendance.faculty },
                    { label: 'Support Staff', pct: data.attendance.support },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span>{label}</span>
                        <span className="font-bold" style={{ color: '#C9A020' }}>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E4E1D8' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#C9A020' }} />
                      </div>
                    </div>
                  ))}
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
              <button onClick={handleGenerateReport} className="btn-gold w-full flex items-center justify-center gap-2">
                <BarChart2 size={14} /> Generate Report
              </button>
              <button onClick={() => toast.success('Exporting raw data to CSV...')} className="btn-outline w-full flex items-center justify-center gap-2">
                <Download size={14} /> Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Modal */}
      {showTopPerformersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center text-gold-600 shadow-sm border border-gold-100">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Institutional Top Performers</h2>
                  <p className="text-sm text-gray-500">Recognizing academic excellence across all grades.</p>
                </div>
              </div>
              <button onClick={() => setShowTopPerformersModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="px-8 py-4 bg-white border-b flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <Filter size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter by Grade</span>
                </div>
                <div className="flex gap-2">
                  {['All Grades', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                    <button 
                      key={g}
                      onClick={() => setPerformerGradeFilter(g)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        performerGradeFilter === g 
                        ? 'bg-gold-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs font-medium text-gray-400">
                Found <span className="text-gold-600 font-bold">{filteredPerformers.length}</span> high-achieving students
              </div>
            </div>

            {/* Modal Content - Scrollable Table */}
            <div className="flex-1 overflow-auto px-8 py-6">
              <table className="table w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="rounded-tl-xl border-b py-4 pl-4">Rank</th>
                    <th className="border-b py-4">Student Name</th>
                    <th className="border-b py-4">Grade & Section</th>
                    <th className="border-b py-4 text-center">Academic Score</th>
                    <th className="rounded-tr-xl border-b py-4 pr-4 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPerformers.map((p, i) => (
                    <tr key={p.id} className="group hover:bg-gold-50/30 transition-colors">
                      <td className="py-4 pl-4 border-b group-last:border-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-gold-500 text-white shadow-lg' : 
                          i === 1 ? 'bg-gray-400 text-white shadow-md' :
                          i === 2 ? 'bg-orange-400 text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="py-4 border-b group-last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gold-600 font-bold border-2 border-white shadow-sm">
                            {p.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="font-bold text-gray-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 border-b group-last:border-0 text-gray-600 font-medium">
                        {p.grade} <span className="mx-1 text-gray-300">|</span> {p.section}
                      </td>
                      <td className="py-4 border-b group-last:border-0 text-center">
                        <span className="text-lg font-black text-gray-900">{p.score}%</span>
                      </td>
                      <td className="py-4 pr-4 border-b group-last:border-0 text-right">
                        <div className="flex items-center justify-end gap-2 text-green-600 font-bold text-xs">
                          <TrendingUp size={14} /> Exceptional
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPerformers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-dashed border-gray-200">
                    <User className="text-gray-300" size={32} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">No Top Performers Found</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any students in {performerGradeFilter} with high-achieving scores for this period.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowTopPerformersModal(false)}
                className="btn-outline px-8"
              >
                Close View
              </button>
              <button 
                onClick={() => {
                  toast.success(`Exporting top performers report for ${performerGradeFilter}...`)
                  setShowTopPerformersModal(false)
                }}
                className="btn-gold px-8 flex items-center gap-2"
              >
                <Download size={16} /> Export List
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
