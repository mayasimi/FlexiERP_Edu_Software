'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { academicsApi } from '@/lib/api'
import { adminMockViews } from '@/lib/admin-mock-db'
import { FolderOpen, Plus, User, Trophy, Trash2, Edit3, X, Check } from 'lucide-react'
const typeStyle: Record<string, string> = {
  Core: 'badge-green', Language: 'badge-gold', Elective: 'badge-blue',
}
type Subject = {
  id: string
  code: string
  type: 'Core' | 'Language' | 'Elective'
  name: string
  teacher: string
  max_marks: string
}

export default function AcademicsPage() {
  const [selectedClass, setSelectedClass] = useState('c10')
  const [selectedSection, setSelectedSection] = useState('s10a')
  const [showForm, setShowForm] = useState(false)
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(() => [...adminMockViews.academics.subjects])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const SUBJECTS_STORAGE_KEY = 'flexierp_subjects'

  // Form State
  const [formData, setFormData] = useState<Omit<Subject, 'id'>>({
    name: '',
    code: '',
    type: 'Core',
    teacher: '',
    max_marks: '100 (Theory)',
  })

  const { data: classes = adminMockViews.academics.classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicsApi.getClasses().then(r => r.data),
    placeholderData: adminMockViews.academics.classes,
  })

  // In a real app, this query would be enabled and filtered by class/section
  const { data: subjects = localSubjects } = useQuery({
    queryKey: ['subjects', selectedClass, selectedSection],
    queryFn: () => academicsApi.getSubjects(selectedClass, selectedSection).then(r => r.data),
    placeholderData: localSubjects,
    enabled: false // Using local state for this simulation
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBJECTS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length >= 0) {
        setLocalSubjects(parsed as Subject[])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(localSubjects))
    } catch {
      // ignore
    }
  }, [localSubjects])

  const currentClass = classes.find((c: typeof adminMockViews.academics.classes[number]) => c.id === selectedClass)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSubject) {
      setLocalSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...formData } : s))
      setEditingSubject(null)
    } else {
      const newSub = {
        ...formData,
        id: `s${localSubjects.length + 1}`,
      }
      setLocalSubjects(prev => [...prev, newSub])
    }
    setShowForm(false)
    setFormData({ name: '', code: '', type: 'Core', teacher: '', max_marks: '100 (Theory)' })
  }

  const handleEdit = (sub: any) => {
    setEditingSubject(sub)
    setFormData({
      name: sub.name, code: sub.code, type: sub.type, teacher: sub.teacher, max_marks: sub.max_marks
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      setLocalSubjects(prev => prev.filter(s => s.id !== id))
    }
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Entry', onClick: () => { setEditingSubject(null); setShowForm(true); } }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Courses & Subjects</h1>
        <p className="page-subtitle">Manage curriculum hierarchy, assigned staff, and grading metrics.</p>
      </div>

      <div className="px-6 pb-8">
        <div className="flex gap-4">
          {/* Class Tree */}
          <div className="card w-56 flex-shrink-0 animate-in stagger-1 h-fit">
            <h3 className="font-bold mb-4">Class Structure</h3>
            <div className="space-y-1">
              {classes.map((cls: typeof adminMockViews.academics.classes[number]) => (
                <div key={cls.id}>
                  <button
                    onClick={() => { setSelectedClass(cls.id); setSelectedSection(cls.sections[0]?.id) }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left hover:bg-gray-50 transition-colors">
                    <FolderOpen size={14} style={{ color: '#6B6660' }} />
                    <span className="font-medium">{cls.name}</span>
                  </button>
                  {selectedClass === cls.id && cls.sections.map((sec: typeof adminMockViews.academics.classes[number]['sections'][number]) => (
                    <button key={sec.id}
                      onClick={() => setSelectedSection(sec.id)}
                      className="flex items-center gap-2 w-full pl-7 py-1.5 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: selectedSection === sec.id ? 'rgba(201,160,32,0.1)' : 'transparent',
                        color: selectedSection === sec.id ? '#C9A020' : '#6B6660',
                        fontWeight: selectedSection === sec.id ? 600 : 400,
                      }}>
                      <FolderOpen size={13} />
                      {sec.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Subjects Grid */}
          <div className="flex-1 animate-in stagger-2">
            {showForm ? (
              <div className="card animate-in fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-lg">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Subject Name</label>
                      <input type="text" className="input" placeholder="e.g. Advanced Physics" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="label">Subject Code</label>
                      <input type="text" className="input" placeholder="e.g. PHY201" 
                        value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
                    </div>
                    <div>
                      <label className="label">Type</label>
                      <select className="select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as Subject['type']})}>
                        <option>Core</option>
                        <option>Language</option>
                        <option>Elective</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Assign Teacher</label>
                      <select className="select" value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} required>
                        <option value="">Select Teacher</option>
                        {adminMockViews.academics.teachers.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Max Marks / Grading Metric</label>
                      <input type="text" className="input" placeholder="e.g. 100 (Theory) / 50 (Practical)" 
                        value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-6">Cancel</button>
                    <button type="submit" className="btn-gold px-8 flex items-center gap-2">
                      <Check size={18} /> {editingSubject ? 'Update Subject' : 'Save Subject'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">
                    Subjects for {currentClass?.name} – {currentClass?.sections.find((s: typeof adminMockViews.academics.classes[number]['sections'][number]) => s.id === selectedSection)?.name}
                  </h2>
                  <span className="text-sm" style={{ color: '#6B6660' }}>{subjects.length} Active Subjects</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((sub: any) => (
                    <div key={sub.id} className="card-hover group relative">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(sub)} className="p-1.5 bg-white border rounded-lg hover:text-gold-600 transition-colors shadow-sm" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="p-1.5 bg-white border rounded-lg hover:text-red-600 transition-colors shadow-sm" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <span className="badge badge-gray text-xs font-mono">{sub.code}</span>
                        <span className={`badge ${typeStyle[sub.type] || 'badge-gray'}`}>{sub.type}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-3">{sub.name}</h3>
                      <div className="h-px mb-3" style={{ background: '#E4E1D8' }} />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: '#6B6660' }}>Assigned Teacher</p>
                          <div className="flex items-center gap-1.5">
                            <User size={13} style={{ color: '#C9A020' }} />
                            <span className="font-medium">{sub.teacher}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: '#6B6660' }}>Max Marks</p>
                          <div className="flex items-center gap-1.5">
                            <Trophy size={13} style={{ color: '#C9A020' }} />
                            <span className="font-medium">{sub.max_marks}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Subject Card */}
                  <button 
                    onClick={() => { setEditingSubject(null); setShowForm(true); }}
                    className="card border-dashed flex flex-col items-center justify-center gap-2 py-8 hover:border-gold-500 transition-colors"
                    style={{ borderStyle: 'dashed', borderColor: '#C9A020' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                         style={{ background: 'rgba(201,160,32,0.1)' }}>
                      <Plus size={18} style={{ color: '#C9A020' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#C9A020' }}>Add Subject</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
