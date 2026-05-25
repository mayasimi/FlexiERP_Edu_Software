'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { settingsApi } from '@/lib/api'
import { adminMockViews } from '@/lib/admin-mock-db'
import toast from 'react-hot-toast'
import { Plus, Pencil, Megaphone, X, Check, Users } from 'lucide-react'

type ClassRow = {
  id: string
  level: string
  sections: string
  capacity_used: number
  capacity_total: number
  lead_faculty: string
}
type TermRow = {
  id: string
  name: string
  start: string
  end: string
  weeks: number
  status: string
}
type NoticeRow = {
  id: string
  title: string
  audience: string
  body: string
  date: string
  highlight: boolean
}

const MOCK_CLASSES: ClassRow[] = adminMockViews.settings.classes.map(c => ({ ...c }))
const MOCK_STAFF = adminMockViews.settings.staff
const MOCK_TERMS: TermRow[] = adminMockViews.settings.terms.map(t => ({ ...t }))
const MOCK_NOTICES: NoticeRow[] = adminMockViews.settings.notices.map(n => ({ ...n }))

export default function SettingsPage() {
  const [year, setYear] = useState('2023 - 2024')
  const [showAddClassForm, setShowAddClassForm] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [localClasses, setLocalClasses] = useState<ClassRow[]>(MOCK_CLASSES)
  const [classFormData, setClassFormData] = useState({
    level: '',
    sections: '',
    capacity_total: '',
    lead_faculty: ''
  })

  // Term States
  const [localTerms, setLocalTerms] = useState<TermRow[]>(MOCK_TERMS)
  const [showTermForm, setShowTermForm] = useState(false)
  const [editingTerm, setEditingTerm] = useState<TermRow | null>(null)
  const [termFormData, setTermFormData] = useState({
    name: '',
    start: '',
    end: '',
    weeks: '',
    status: 'Upcoming'
  })

  // Notice States
  const [localNotices, setLocalNotices] = useState<NoticeRow[]>(MOCK_NOTICES)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [noticeFormData, setNoticeFormData] = useState({
    title: '',
    audience: 'ALL STAFF & STUDENTS',
    body: '',
    highlight: false
  })

  const qc = useQueryClient()

  const { data: queryClasses } = useQuery({
    queryKey: ['settings-classes'],
    queryFn: () => settingsApi.getClasses().then(r => r.data),
    placeholderData: MOCK_CLASSES,
    enabled: false // Using local state for simulation
  })

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingClass) {
      setLocalClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, ...classFormData, capacity_total: parseInt(classFormData.capacity_total) || 0 } : c))
      toast.success('Class updated successfully')
    } else {
      const newClass = {
        id: (localClasses.length + 1).toString(),
        level: classFormData.level,
        sections: classFormData.sections,
        capacity_used: 0,
        capacity_total: parseInt(classFormData.capacity_total) || 0,
        lead_faculty: classFormData.lead_faculty
      }
      setLocalClasses(prev => [...prev, newClass])
      toast.success('Class added successfully')
    }
    setShowAddClassForm(false)
    setEditingClass(null)
    setClassFormData({ level: '', sections: '', capacity_total: '', lead_faculty: '' })
  }

  const handleEditClass = (cls: ClassRow) => {
    setEditingClass(cls)
    setClassFormData({
      level: cls.level,
      sections: cls.sections,
      capacity_total: cls.capacity_total.toString(),
      lead_faculty: cls.lead_faculty
    })
    setShowAddClassForm(true)
  }

  const handleTermSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTerm) {
      setLocalTerms(prev => prev.map(t => t.id === editingTerm.id ? { ...t, ...termFormData, weeks: parseInt(termFormData.weeks) || 0 } : t))
      toast.success('Term updated successfully')
    } else {
      const newTerm = {
        id: (localTerms.length + 1).toString(),
        ...termFormData,
        weeks: parseInt(termFormData.weeks) || 0
      }
      setLocalTerms([...localTerms, newTerm])
      toast.success('Term added successfully')
    }
    setShowTermForm(false)
    setEditingTerm(null)
    setTermFormData({ name: '', start: '', end: '', weeks: '', status: 'Upcoming' })
  }

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newNotice = {
      id: (localNotices.length + 1).toString(),
      ...noticeFormData,
      date: 'Just Now'
    }
    setLocalNotices([newNotice, ...localNotices])
    setShowNoticeForm(false)
    setNoticeFormData({ title: '', audience: 'ALL STAFF & STUDENTS', body: '', highlight: false })
    toast.success('Notice posted successfully')
  }

  const handleEditTerm = (term: TermRow) => {
    setEditingTerm(term)
    setTermFormData({
      name: term.name,
      start: term.start,
      end: term.end,
      weeks: term.weeks.toString(),
      status: term.status
    })
    setShowTermForm(true)
  }
  const { data: notices = MOCK_NOTICES } = useQuery({
    queryKey: ['settings-notices'],
    queryFn: () => settingsApi.getNotices().then(r => r.data),
    placeholderData: MOCK_NOTICES,
  })

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Class & Term Settings</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="page-subtitle">Manage academic structures and broadcast institutional notices.</p>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6660' }}>Academic Year</span>
            <select value={year} onChange={e => setYear(e.target.value)} className="select text-sm py-1.5 w-32">
              <option>2023 - 2024</option><option>2024 - 2025</option>
            </select>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Add Class Form / Class Directory */}
            {showAddClassForm ? (
              <div className="card animate-in fade-in">
                <div className="flex items-center justify-between mb-6 pb-2 border-b" style={{ borderColor: '#E4E1D8' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,160,32,0.1)' }}>
                      <Plus size={16} style={{ color: '#C9A020' }} />
                    </div>
                    <h2 className="font-bold">{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
                  </div>
                  <button onClick={() => { setShowAddClassForm(false); setEditingClass(null); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                <form onSubmit={handleClassSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Class Level</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. Grade 11" 
                        value={classFormData.level}
                        onChange={e => setClassFormData({...classFormData, level: e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <label className="label">Sections</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="e.g. A, B, C" 
                        value={classFormData.sections}
                        onChange={e => setClassFormData({...classFormData, sections: e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <label className="label">Total Capacity</label>
                      <input 
                        type="number" 
                        className="input" 
                        placeholder="e.g. 40" 
                        value={classFormData.capacity_total}
                        onChange={e => setClassFormData({...classFormData, capacity_total: e.target.value})}
                        required 
                      />
                    </div>
                    <div>
                      <label className="label">Lead Faculty</label>
                      <select 
                        className="select" 
                        value={classFormData.lead_faculty}
                        onChange={e => setClassFormData({...classFormData, lead_faculty: e.target.value})}
                        required
                      >
                        <option value="">Select Faculty</option>
                        {MOCK_STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: '#E4E1D8' }}>
                    <button type="button" onClick={() => setShowAddClassForm(false)} className="btn-outline px-6">Cancel</button>
                    <button type="submit" className="btn-gold px-8 flex items-center gap-2">
                      <Check size={18} /> Save Class
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="card animate-in stagger-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Class Directory</h2>
                  <button 
                    onClick={() => setShowAddClassForm(true)}
                    className="btn-gold text-sm px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Class
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Sections</th>
                        <th>Capacity</th>
                        <th>Lead Faculty</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localClasses.map((cls: ClassRow) => (
                        <tr key={cls.id}>
                          <td className="font-semibold">{cls.level}</td>
                          <td style={{ color: '#6B6660' }}>{cls.sections}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{cls.capacity_used} / {cls.capacity_total}</span>
                            </div>
                          </td>
                          <td style={{ color: '#6B6660' }}>{cls.lead_faculty}</td>
                          <td>
                            <button 
                              onClick={() => handleEditClass(cls)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            >
                              <Pencil size={14} style={{ color: '#6B6660' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={() => { setEditingClass(null); setShowAddClassForm(true); setClassFormData({ level: '', sections: '', capacity_total: '', lead_faculty: '' }); }}
                  className="block mt-3 text-sm font-medium hover:underline" 
                  style={{ color: '#C9A020' }}
                >
                  Add Another Class +
                </button>
              </div>
            )}

            {/* Academic Terms */}
            <div className="card animate-in stagger-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Academic Terms</h2>
                {!showTermForm && (
                  <button 
                    onClick={() => { setEditingTerm(null); setShowTermForm(true); setTermFormData({ name: '', start: '', end: '', weeks: '', status: 'Upcoming' }); }}
                    className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Term
                  </button>
                )}
              </div>

              {showTermForm ? (
                <div className="animate-in fade-in space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold">{editingTerm ? 'Edit Term' : 'Add New Term'}</h3>
                    <button onClick={() => setShowTermForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                  <form onSubmit={handleTermSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label text-xs">Term Name</label>
                        <input 
                          type="text" 
                          className="input py-1.5 text-sm" 
                          placeholder="e.g. Summer Term 2024" 
                          value={termFormData.name}
                          onChange={e => setTermFormData({...termFormData, name: e.target.value})}
                          required 
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Start Date</label>
                        <input 
                          type="text" 
                          className="input py-1.5 text-sm" 
                          placeholder="e.g. June 1" 
                          value={termFormData.start}
                          onChange={e => setTermFormData({...termFormData, start: e.target.value})}
                          required 
                        />
                      </div>
                      <div>
                        <label className="label text-xs">End Date</label>
                        <input 
                          type="text" 
                          className="input py-1.5 text-sm" 
                          placeholder="e.g. Aug 30" 
                          value={termFormData.end}
                          onChange={e => setTermFormData({...termFormData, end: e.target.value})}
                          required 
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Duration (Weeks)</label>
                        <input 
                          type="number" 
                          className="input py-1.5 text-sm" 
                          placeholder="12" 
                          value={termFormData.weeks}
                          onChange={e => setTermFormData({...termFormData, weeks: e.target.value})}
                          required 
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Status</label>
                        <select 
                          className="select py-1.5 text-sm" 
                          value={termFormData.status}
                          onChange={e => setTermFormData({...termFormData, status: e.target.value})}
                        >
                          <option>Active</option>
                          <option>Upcoming</option>
                          <option>Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: '#E4E1D8' }}>
                      <button type="button" onClick={() => setShowTermForm(false)} className="btn-outline text-xs px-4 py-1.5">Cancel</button>
                      <button type="submit" className="btn-gold text-xs px-4 py-1.5 flex items-center gap-1.5">
                        <Check size={14} /> {editingTerm ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {localTerms.map(term => (
                    <div key={term.id} className="rounded-xl p-4 transition-all"
                         style={{
                           border: `2px solid ${term.status === 'Active' ? '#C9A020' : '#E4E1D8'}`,
                           background: term.status === 'Active' ? 'rgba(201,160,32,0.04)' : '#F7F6F3',
                         }}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm">{term.name}</h3>
                        <span className="badge text-xs"
                              style={{ background: term.status === 'Active' ? '#ECFDF5' : '#F3F4F6',
                                       color: term.status === 'Active' ? '#059669' : '#4B5563' }}>
                          {term.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs" style={{ color: '#6B6660' }}>
                        <p>📅 {term.start} – {term.end}</p>
                        <p>🎓 {term.weeks} Weeks</p>
                      </div>
                      <button 
                        onClick={() => handleEditTerm(term)}
                        className="mt-3 w-full text-xs py-1.5 rounded-lg border transition-all hover:border-gold"
                        style={{ borderColor: '#E4E1D8', color: '#0D0D0D' }}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notice Board */}
          <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone size={18} style={{ color: '#C9A020' }} />
                <h2 className="font-bold">Notice Board</h2>
              </div>
              {!showNoticeForm && (
                <button 
                  onClick={() => setShowNoticeForm(true)}
                  className="btn-dark text-sm px-3 py-1.5 flex items-center gap-1.5"
                >
                  Post Notice
                </button>
              )}
            </div>

            {showNoticeForm ? (
              <div className="animate-in fade-in space-y-4 mb-6 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: '#E4E1D8' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-gold-700">New Institutional Notice</h3>
                  <button onClick={() => setShowNoticeForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleNoticeSubmit} className="space-y-4">
                  <div>
                    <label className="label text-xs">Notice Title</label>
                    <input 
                      type="text" 
                      className="input py-2 text-sm" 
                      placeholder="e.g. End of Term Holiday Notice" 
                      value={noticeFormData.title}
                      onChange={e => setNoticeFormData({...noticeFormData, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Target Audience</label>
                    <select 
                      className="select py-2 text-sm" 
                      value={noticeFormData.audience}
                      onChange={e => setNoticeFormData({...noticeFormData, audience: e.target.value})}
                    >
                      <option>ALL STAFF & STUDENTS</option>
                      <option>FACULTY ONLY</option>
                      <option>STUDENTS ONLY</option>
                      <option>PARENTS ONLY</option>
                      <option>GRADE 9-12</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Notice Content</label>
                    <textarea 
                      className="input py-2 text-sm min-h-[100px]" 
                      placeholder="Write your notice here..." 
                      value={noticeFormData.body}
                      onChange={e => setNoticeFormData({...noticeFormData, body: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="highlight"
                      className="w-4 h-4 rounded" 
                      style={{ accentColor: '#C9A020' }}
                      checked={noticeFormData.highlight}
                      onChange={e => setNoticeFormData({...noticeFormData, highlight: e.target.checked})}
                    />
                    <label htmlFor="highlight" className="text-xs font-medium cursor-pointer">Highlight this notice (Urgent)</label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowNoticeForm(false)} className="btn-outline text-xs px-4 py-2">Cancel</button>
                    <button type="submit" className="btn-gold text-xs px-6 py-2 flex items-center gap-2">
                      <Megaphone size={14} /> Post Notice
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                {localNotices.map((n: NoticeRow) => (
                  <div key={n.id} className="rounded-xl p-4 transition-all hover:translate-x-1"
                       style={{
                         background: n.highlight ? 'rgba(201,160,32,0.06)' : '#F7F6F3',
                         border: `1px solid ${n.highlight ? 'rgba(201,160,32,0.25)' : '#E4E1D8'}`,
                         borderLeft: n.highlight ? '4px solid #C9A020' : '1px solid #E4E1D8',
                       }}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm">{n.title}</h3>
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#A09080' }}>{n.date}</span>
                    </div>
                    <p className="text-xs font-semibold tracking-wider mb-1.5"
                       style={{ color: '#C9A020' }}>{n.audience}</p>
                    <p className="text-sm" style={{ color: '#6B6660' }}>{n.body}</p>
                  </div>
                ))}
              </div>
            )}
            <a href="#" className="block mt-4 text-sm text-center font-medium" style={{ color: '#6B6660' }}>
              View Notice Archive
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
