'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { feeApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, ArrowRight, BookOpen, Building2, ChevronDown, ChevronLeft, Clock, MoreVertical } from 'lucide-react'
import { adminMockViews } from '@/lib/admin-mock-db'

const MOCK_FEE = adminMockViews.fee_management

const GRADES = ['All Grades', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const statusStyle: Record<string, { label: string; cls: string }> = {
  Active: { label: 'Active', cls: 'badge-green' },
  Pending: { label: 'Pending', cls: 'badge-gold' },
  Overdue: { label: 'Overdue', cls: 'badge-red' },
}

export default function FeeManagementPage() {
  const [selectedGrade, setSelectedGrade] = useState('All Grades')
  const [showGradeDropdown, setShowGradeDropdown] = useState(false)
  const [viewAllTransactions, setViewAllTransactions] = useState(false)
  const gradeDropdownRef = useRef<HTMLDivElement>(null)
  const { data = MOCK_FEE } = useQuery({
    queryKey: ['fee-dashboard'],
    queryFn: () => feeApi.getDashboard().then(r => r.data),
    placeholderData: MOCK_FEE,
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setShowGradeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredFeeTypes = data.fee_types.filter((fee: any) => {
    if (selectedGrade === 'All Grades') return true
    return fee.grade === selectedGrade
  })
  return (
    <AppLayout>
      <Topbar action={{ label: 'Record Payment', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">{viewAllTransactions ? 'All Transactions' : 'Fee Dashboard'}</h1>
        <p className="page-subtitle">
          {viewAllTransactions 
            ? 'A comprehensive log of all financial transactions and payments.' 
            : 'Overview of institutional collections and outstandings.'}
        </p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        {viewAllTransactions ? (
          <div className="animate-in">
            <button 
              onClick={() => setViewAllTransactions(false)}
              className="flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform" 
              style={{ color: '#C9A020' }}
            >
              <ChevronLeft size={16} />
              Back to Overview
            </button>
            
            <div className="card">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Method</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_transactions.map((tx: any) => (
                      <tr key={tx.id} className="animate-in fade-in">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: tx.color }} />
                            <span className="font-semibold">{tx.student}</span>
                          </div>
                        </td>
                        <td className="font-bold text-green-600">+{formatCurrency(tx.amount)}</td>
                        <td className="text-muted-foreground">{tx.desc}</td>
                        <td><span className="badge badge-gray">{tx.method}</span></td>
                        <td className="text-muted-foreground text-sm">{tx.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in stagger-1">
          {/* Total Collected */}
          <div className="stat-card" style={{ borderBottom: '3px solid #C9A020' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Total Collected</span>
              <Building2 size={18} style={{ color: '#C9A020' }} />
            </div>
            <div className="stat-value">{formatCurrency(data.total_collected)}</div>
            <p className="text-xs" style={{ color: '#10B981' }}>↗ {data.total_change}</p>
          </div>

          {/* Pending Clearance */}
          <div className="stat-card" style={{ borderBottom: '3px solid #C9A020' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Pending Clearance</span>
              <Clock size={18} style={{ color: '#C9A020' }} />
            </div>
            <div className="stat-value">{formatCurrency(data.pending_clearance)}</div>
            <p className="text-xs" style={{ color: '#6B6660' }}>{data.pending_invoices} invoices processing</p>
          </div>

          {/* Overdue */}
          <div className="stat-card" style={{ borderBottom: '3px solid #EF4444' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Overdue Fees</span>
              <AlertTriangle size={18} style={{ color: '#EF4444' }} />
            </div>
            <div className="stat-value" style={{ color: '#EF4444' }}>{formatCurrency(data.overdue_fees)}</div>
            <p className="text-xs" style={{ color: '#EF4444' }}>⚠ Requires immediate action</p>
          </div>
        </div>

        {/* Fee Breakdown + Recent Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Fee Breakdown Table */}
          <div className="card xl:col-span-2 p-0 overflow-hidden animate-in stagger-2">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E4E1D8' }}>
              <div className="flex items-center gap-4">
                <h2 className="font-bold text-base">Fee Breakdown</h2>
                
                {/* Grade Dropdown */}
                <div className="relative" ref={gradeDropdownRef}>
                  <button 
                    onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all hover:border-gold-500"
                    style={{ borderColor: '#E4E1D8', color: selectedGrade !== 'All Grades' ? '#C9A020' : '#6B6660' }}
                  >
                    <BookOpen size={14} />
                    {selectedGrade}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showGradeDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showGradeDropdown && (
                    <div className="absolute left-0 mt-2 w-48 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                         style={{ borderColor: '#E4E1D8' }}>
                      <div className="py-1">
                        {GRADES.map((grade) => (
                          <button
                            key={grade}
                            onClick={() => {
                              setSelectedGrade(grade)
                              setShowGradeDropdown(false)
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedGrade === grade ? 'bg-gold-50 text-gold-700 font-semibold' : 'hover:bg-gray-50'}`}
                            style={{ color: selectedGrade === grade ? '#C9A020' : '#0D0D0D' }}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Fee Component</th>
                  {selectedGrade === 'All Grades' && <th>Grade Level</th>}
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeTypes.map((fee: any) => {
                  const s = statusStyle[fee.status] || { label: fee.status, cls: 'badge-gray' }
                  return (
                    <tr key={fee.id} className="animate-in fade-in">
                      <td className="font-medium">{fee.name}</td>
                      {selectedGrade === 'All Grades' && <td style={{ color: '#6B6660' }}>{fee.grade}</td>}
                      <td className="font-semibold" style={{ color: '#0D0D0D' }}>
                        {formatCurrency(fee.amount)}
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <button className="p-1.5 rounded hover:bg-gray-100">
                          <MoreVertical size={14} style={{ color: '#6B6660' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Recent Transactions */}
          <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">Recent Transactions</h2>
              <button 
                onClick={() => setViewAllTransactions(true)}
                className="text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all" 
                style={{ color: '#C9A020' }}
              >
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-4">
              {data.recent_transactions.slice(0, 5).map((tx: typeof MOCK_FEE['recent_transactions'][0]) => (
                <div key={tx.id} className="flex gap-3">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                       style={{ background: tx.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-1">
                      <p className="font-semibold text-sm truncate">{tx.student}</p>
                      <p className="text-sm font-semibold flex-shrink-0" style={{ color: '#10B981' }}>
                        +{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: '#6B6660' }}>{tx.desc}</p>
                    <div className="flex justify-between mt-0.5">
                      <p className="text-xs" style={{ color: '#A09080' }}>{tx.time}</p>
                      <span className="badge badge-gray text-xs">{tx.method}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
