'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { FileText, Filter, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { adminMockViews } from '@/lib/admin-mock-db'

const MOCK_SUMMARY = adminMockViews.attendance.summary

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [hasQueried, setHasQueried] = useState(false)
  const [localSummary] = useState(MOCK_SUMMARY)

  // Format selected date to match MOCK_SUMMARY format (e.g., "May 20, 2026")
  const formatDateForFilter = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filteredSummary = localSummary.filter(item => 
    item.date === formatDateForFilter(selectedDate)
  )

  const handleQuery = () => {
    setHasQueried(true)
  }

  const handleGenerateReport = () => {
    if (!hasQueried || filteredSummary.length === 0) {
      toast.error('Please query records before generating a report.')
      return
    }
    toast.success(`Generating report for ${filteredSummary.length} classes on ${formatDateForFilter(selectedDate)}...`)
  }

  return (
    <AppLayout>
      <Topbar action={hasQueried ? { label: 'Generate Report', onClick: handleGenerateReport } : undefined} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Attendance Overview</h1>
        <p className="page-subtitle">
          Select a date to fetch and review institutional attendance performance.
        </p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Date Query Section */}
        <div className="card animate-in stagger-1">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>
                Select Attendance Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => {
                    setSelectedDate(e.target.value)
                    setHasQueried(false) // Reset view when date changes
                  }} 
                  className="input w-full pl-10" 
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleQuery} className="btn-gold whitespace-nowrap px-8">
                <TrendingUp size={16} className="mr-2" /> Fetch Attendance Records
              </button>
            </div>
          </div>
        </div>

        {hasQueried ? (
          <div className="space-y-6 animate-in stagger-2">
            {/* Overview Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Daily Avg. Attendance</span>
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <div className="stat-value">
                  {filteredSummary.length > 0 
                    ? `${Math.round(filteredSummary.reduce((acc, curr) => acc + curr.percentage, 0) / filteredSummary.length)}%`
                    : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">For {formatDateForFilter(selectedDate)}</p>
              </div>
              <div className="stat-card">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Classes Recorded</span>
                  <div className="w-2 h-2 rounded-full bg-gold-500" />
                </div>
                <div className="stat-value">{filteredSummary.length} Classes</div>
                <p className="text-xs text-muted-foreground">Status: {filteredSummary.length > 0 ? 'Active' : 'Pending'}</p>
              </div>
              <div className="stat-card">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Present</span>
                  <CheckCircle size={16} className="text-green-500" />
                </div>
                <div className="stat-value">
                  {filteredSummary.reduce((acc, curr) => acc + curr.present, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Students across all classes</p>
              </div>
            </div>

            {/* Summary Table */}
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
                <h2 className="font-bold text-lg">Class Attendance Summary - {formatDateForFilter(selectedDate)}</h2>
                <button onClick={handleGenerateReport} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <FileText size={14} /> Generate Report
                </button>
              </div>
              
              <div className="table-wrapper">
                {filteredSummary.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Grade & Section</th>
                        <th className="text-center">Present / Absent</th>
                        <th className="text-center">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSummary.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="text-sm font-medium">{item.date}</td>
                          <td>
                            <div>
                              <p className="font-bold text-sm">{item.grade}</p>
                              <p className="text-xs text-muted-foreground">{item.section}</p>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={12} />
                                <span className="font-bold text-sm">{item.present}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-500">
                                <XCircle size={12} />
                                <span className="font-bold text-sm">{item.absent}</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${item.percentage >= 90 ? 'text-green-600' : item.percentage >= 75 ? 'text-gold-600' : 'text-red-500'}`}>
                                {item.percentage}%
                              </span>
                              <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${item.percentage >= 90 ? 'bg-green-500' : item.percentage >= 75 ? 'bg-gold-500' : 'bg-red-500'}`} 
                                     style={{ width: `${item.percentage}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Filter className="text-gray-400" size={32} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">No Records Found</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      We couldn't find any attendance logs for {formatDateForFilter(selectedDate)}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl" style={{ borderColor: '#E4E1D8' }}>
            <div className="w-20 h-20 rounded-full bg-gold-50 flex items-center justify-center mb-6">
              <Filter className="text-gold-600" size={40} />
            </div>
            <h2 className="text-xl font-bold mb-2">Ready to Query Attendance</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Select a specific date above and click "Fetch Attendance Records" to view the institutional summary and generate reports.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
