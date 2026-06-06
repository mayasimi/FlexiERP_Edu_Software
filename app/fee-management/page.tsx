'use client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { feeApi } from '@/lib/api'
import { formatCurrency, getAcademicTerms, getActiveTermId, getClassLevelsFromDirectory, type AcademicTerm, withTermKey } from '@/lib/utils'
import { Building2, AlertTriangle, Clock, Pencil, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_FEE = {
  total_collected: 1245000,
  total_change: '+12% from last term',
  pending_clearance: 84500,
  pending_invoices: 42,
  overdue_fees: 12350,
  fee_types: [
    { id: 1, name: 'Tuition - Spring Term', grade: 'Grade 10', amount: 4500, status: 'Active' },
    { id: 2, name: 'Lab & Materials Fee', grade: 'Grade 11 - Science', amount: 350, status: 'Pending' },
    { id: 3, name: 'Transportation (Bus Route A)', grade: 'All Grades', amount: 800, status: 'Active' },
    { id: 4, name: 'Library Late Fees', grade: 'Various', amount: 45, status: 'Overdue' },
    { id: 5, name: 'Extracurricular - Robotics', grade: 'Grade 9-12', amount: 150, status: 'Active' },
  ],
  recent_transactions: [
    { id: 1, student: 'Alice Johnson', amount: 4500, method: 'Card ends *4211', desc: 'Tuition - ID #8472', time: 'Today, 09:41 AM', color: '#C9A020' },
    { id: 2, student: 'Michael Smith', amount: 800, method: 'Bank Transfer', desc: 'Transport Fee - ID #9921', time: 'Yesterday, 14:22 PM', color: '#6B6660' },
    { id: 3, student: 'Emma Davis', amount: 350, method: 'Cash', desc: 'Lab Fee - ID #7364', time: 'Oct 24, 11:05 AM', color: '#6B6660' },
    { id: 4, student: 'System Auto-Billed', amount: 135, method: 'Automated', desc: 'Late Penalty Applied (3 Accounts)', time: 'Oct 23, 00:00 AM', color: '#EF4444' },
  ]
}

type FeeDashboard = typeof MOCK_FEE

const statusStyle: Record<string, { label: string; cls: string }> = {
  Active: { label: 'Active', cls: 'badge-green' },
  Pending: { label: 'Pending', cls: 'badge-gold' },
  Overdue: { label: 'Overdue', cls: 'badge-red' },
}

type FeeItem = {
  id: number | string
  name: string
  grade: string
  amount: number
  status: string
}

type FeeTransaction = (typeof MOCK_FEE.recent_transactions)[number] & { id: number | string }

const FEE_ITEMS_STORAGE_KEY = 'edu_fee_items_v1'
const FEE_TRANSACTIONS_STORAGE_KEY = 'edu_fee_transactions_v1'

export default function FeeManagementPage() {
  const { data = MOCK_FEE } = useQuery<FeeDashboard>({
    queryKey: ['fee-dashboard'],
    queryFn: () => feeApi.getDashboard().then(r => r.data),
    placeholderData: MOCK_FEE,
  })

  const [feeItems, setFeeItems] = useState<FeeItem[]>(() => (data.fee_types as FeeItem[]).map((f) => ({ ...f })))
  const [transactions, setTransactions] = useState<FeeTransaction[]>(() => (data.recent_transactions as FeeTransaction[]).map((t) => ({ ...t })))
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [hasMounted, setHasMounted] = useState(false)
  const [classLevels, setClassLevels] = useState<string[]>(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
  const [termIdOverride, setTermIdOverride] = useState<string>('')
  const [activeTermId, setActiveTermId] = useState<string>('')
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [hasLoadedFinanceStore, setHasLoadedFinanceStore] = useState(false)

  useEffect(() => setHasMounted(true), [])

  useEffect(() => {
    if (!hasMounted) return
    setActiveTermId(getActiveTermId(''))
    setTerms(getAcademicTerms([]))
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    if (typeof window === 'undefined') return
    const read = () => {
      const params = new URLSearchParams(window.location.search)
      const term = (params.get('term') ?? '').trim()
      setTermIdOverride(term)
    }
    read()
    window.addEventListener('locationchange', read)
    return () => window.removeEventListener('locationchange', read)
  }, [hasMounted])

  const termKey = useMemo(() => termIdOverride.trim(), [termIdOverride])
  const isHistoryMode = useMemo(() => {
    if (!termKey) return false
    if (!activeTermId) return true
    return termKey !== activeTermId
  }, [activeTermId, termKey])

  const termLabel = useMemo(() => {
    if (!termKey) return ''
    const found = terms.find((t) => t.id === termKey) ?? null
    return found?.name ?? ''
  }, [termKey, terms])

  const storageKey = (baseKey: string) => {
    const id = termKey || activeTermId
    return id ? withTermKey(baseKey, id) : baseKey
  }

  useEffect(() => {
    if (!hasMounted) return
    setClassLevels(getClassLevelsFromDirectory(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']))
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    if (hasLoadedFinanceStore) return
    if (!termKey && !activeTermId) return
    try {
      const feeRaw = window.localStorage.getItem(storageKey(FEE_ITEMS_STORAGE_KEY)) ?? ''
      const txRaw = window.localStorage.getItem(storageKey(FEE_TRANSACTIONS_STORAGE_KEY)) ?? ''
      const feeParsed = feeRaw ? (JSON.parse(feeRaw) as unknown) : null
      const txParsed = txRaw ? (JSON.parse(txRaw) as unknown) : null
      if (Array.isArray(feeParsed)) setFeeItems(feeParsed as FeeItem[])
      if (Array.isArray(txParsed)) setTransactions(txParsed as FeeTransaction[])
    } catch {
    } finally {
      setHasLoadedFinanceStore(true)
    }
  }, [hasLoadedFinanceStore, hasMounted, termKey, activeTermId])

  useEffect(() => {
    if (!hasMounted) return
    if (!hasLoadedFinanceStore) return
    if (isHistoryMode) return
    if (!termKey && !activeTermId) return
    try {
      window.localStorage.setItem(storageKey(FEE_ITEMS_STORAGE_KEY), JSON.stringify(feeItems))
      window.localStorage.setItem(storageKey(FEE_TRANSACTIONS_STORAGE_KEY), JSON.stringify(transactions))
    } catch {
    }
  }, [feeItems, hasLoadedFinanceStore, hasMounted, isHistoryMode, termKey, activeTermId, transactions])

  const classOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: string[] = ['All Classes']
    for (const c of classLevels) {
      const v = (c ?? '').toString().trim()
      if (!v) continue
      const k = v.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      options.push(v)
    }
    for (const item of feeItems) {
      const value = (item.grade ?? '').toString().trim()
      if (!value) continue
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      options.push(value)
    }
    return options
  }, [classLevels, feeItems])

  const visibleFeeItems = useMemo(() => {
    if (selectedClass === 'All Classes') return feeItems
    const q = selectedClass.toLowerCase()
    return feeItems.filter((item) => item.grade.toLowerCase().includes(q))
  }, [feeItems, selectedClass])

  const totalCollected = useMemo(() => transactions.reduce((sum, t) => sum + (Number(t.amount ?? 0) || 0), 0), [transactions])

  const [showFeeModal, setShowFeeModal] = useState(false)
  const [editingFeeId, setEditingFeeId] = useState<number | string | null>(null)
  const [formName, setFormName] = useState('')
  const [formClass, setFormClass] = useState('')
  const [formAmount, setFormAmount] = useState<string>('')
  const [formStatus, setFormStatus] = useState<'Active' | 'Pending' | 'Overdue'>('Active')

  const openAddFee = () => {
    if (isHistoryMode) return toast.error('History mode: switch to the active term to edit fees.')
    setEditingFeeId(null)
    setFormName('')
    setFormClass(selectedClass === 'All Classes' ? '' : selectedClass)
    setFormAmount('')
    setFormStatus('Active')
    setShowFeeModal(true)
  }

  const openEditFee = (fee: FeeItem) => {
    if (isHistoryMode) return toast.error('History mode: switch to the active term to edit fees.')
    setEditingFeeId(fee.id)
    setFormName(fee.name)
    setFormClass(fee.grade)
    setFormAmount(String(fee.amount))
    setFormStatus((fee.status as 'Active' | 'Pending' | 'Overdue') || 'Active')
    setShowFeeModal(true)
  }

  const closeFeeModal = () => setShowFeeModal(false)

  const saveFee = () => {
    if (isHistoryMode) return toast.error('History mode: switch to the active term to edit fees.')
    const name = formName.trim()
    const grade = (formClass || (selectedClass === 'All Classes' ? 'All Classes' : selectedClass)).trim()
    const amount = Number(formAmount)
    const status = formStatus

    if (!name) {
      toast.error('Please enter a fee name.')
      return
    }
    if (!grade) {
      toast.error('Please select a class.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    setFeeItems((prev) => {
      if (editingFeeId !== null) {
        return prev.map((item) =>
          item.id === editingFeeId ? { ...item, name, grade, amount, status } : item
        )
      }
      const next: FeeItem = {
        id: `fee_${Date.now()}`,
        name,
        grade,
        amount,
        status,
      }
      return [next, ...prev]
    })

    toast.success(editingFeeId !== null ? 'Fee item updated.' : 'Fee item added.')
    setShowFeeModal(false)
  }

  const deleteFee = (id: number | string) => {
    if (isHistoryMode) return toast.error('History mode: switch to the active term to edit fees.')
    if (!window.confirm('Delete this fee item?')) return
    setFeeItems((prev) => prev.filter((item) => item.id !== id))
    toast.success('Fee item deleted.')
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'Record Payment', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Fee Dashboard</h1>
        <p className="page-subtitle">Overview of institutional collections and outstandings.</p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        {isHistoryMode ? (
          <div className="card animate-in stagger-1" style={{ background: 'rgba(201,160,32,0.04)', border: '1px solid rgba(201,160,32,0.25)' }}>
            <div className="text-sm" style={{ color: '#6B6660' }}>
              Viewing history term: <span className="font-semibold">{termLabel || termKey}</span>. Editing is disabled in history mode.
            </div>
          </div>
        ) : null}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in stagger-1">
          {/* Total Collected */}
          <div className="stat-card" style={{ borderBottom: '3px solid #C9A020' }}>
            <div className="flex items-center justify-between">
              <span className="stat-label">Total Collected</span>
              <Building2 size={18} style={{ color: '#C9A020' }} />
            </div>
            <div className="stat-value">{formatCurrency(totalCollected || data.total_collected)}</div>
            {!isHistoryMode ? <p className="text-xs" style={{ color: '#10B981' }}>↗ {data.total_change}</p> : null}
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
              <h2 className="font-bold text-base">Fee Breakdown</h2>
              <div className="flex items-center gap-2">
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="select text-sm" style={{ width: 220 }}>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {!isHistoryMode ? (
                  <button className="btn-gold text-sm flex items-center gap-1.5" onClick={openAddFee}>
                    <Plus size={14} />
                    Add Item
                  </button>
                ) : null}
              </div>
            </div>
            {visibleFeeItems.length === 0 ? (
              <div className="p-8 text-sm" style={{ color: '#6B6660' }}>
                No fee items found for this class.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th>Class</th>
                    <th>Amount</th>
                    <th>Status</th>
                    {!isHistoryMode ? <th style={{ width: 160 }}>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleFeeItems.map((fee) => {
                    const s = statusStyle[fee.status] || { label: fee.status, cls: 'badge-gray' }
                    return (
                      <tr key={fee.id}>
                        <td className="font-medium">{fee.name}</td>
                        <td style={{ color: '#6B6660' }}>{fee.grade}</td>
                        <td className="font-semibold" style={{ color: fee.status === 'Overdue' ? '#EF4444' : '#0D0D0D' }}>
                          {formatCurrency(fee.amount)}
                        </td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                        {!isHistoryMode ? (
                          <td>
                            <div className="flex items-center gap-2">
                              <button className="btn-outline px-2 py-1.5 text-xs flex items-center gap-1" onClick={() => openEditFee(fee)}>
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                className="btn-outline px-2 py-1.5 text-xs flex items-center gap-1"
                                style={{ borderColor: '#FCA5A5', color: '#EF4444' }}
                                onClick={() => deleteFee(fee.id)}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">Recent Transactions</h2>
              <a href="#" className="text-xs font-medium" style={{ color: '#C9A020' }}>View All</a>
            </div>
            <div className="space-y-4">
              {transactions.map((tx) => (
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
      </div>

      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingFeeId !== null ? 'Edit Fee Item' : 'Add Fee Item'}</h2>
              <button onClick={closeFeeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Fee Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input" placeholder="e.g. Tuition - Spring Term" />
              </div>
              <div>
                <label className="label">Class</label>
                <select value={formClass} onChange={(e) => setFormClass(e.target.value)} className="select">
                  <option value="">Select Class</option>
                  {classOptions.filter((c) => c !== 'All Classes').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Pending' | 'Overdue')} className="select">
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Amount</label>
                <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="input" placeholder="e.g. 4500" inputMode="decimal" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeFeeModal} className="btn-outline px-8">Cancel</button>
              <button onClick={saveFee} className="btn-gold px-10">
                {editingFeeId !== null ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
