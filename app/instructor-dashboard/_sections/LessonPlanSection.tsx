'use client'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, X, Save, BookOpen, Clock, CheckCircle2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { teacherApi } from '@/lib/api'
import { PageHeader } from '../_components'
import type { Day } from '../_types'

// ── Types ──────────────────────────────────────────────────────────────────
interface LessonPlan {
  id:         string
  title:      string
  subject:    string
  subject_id: number
  group:      string
  section_id: number
  week:       string
  day:        Day
  period:     number
  duration:   string
  objectives: string[]
  activities: string[]
  resources:  string[]
  homework:   string
  status:     'draft' | 'published' | 'completed'
  createdAt:  string
}

type FormData = {
  title:            string
  subject_id:       number
  class_section_id: number
  week_label:       string
  day:              Day
  period_number:    number
  duration:         string
  objectives:       string[]
  activities:       string[]
  resources:        string[]
  homework:         string
  status:           'draft' | 'published' | 'completed'
}

const STATUS_STYLE = {
  draft:     { bg: '#F3F4F6', text: '#4B5563', label: 'Draft'     },
  published: { bg: '#FEF3C7', text: '#92400E', label: 'Published' },
  completed: { bg: '#ECFDF5', text: '#065F46', label: 'Completed' },
}

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const EMPTY_FORM: FormData = {
  title: '', subject_id: 0, class_section_id: 0,
  week_label: '', day: 'Monday', period_number: 1,
  duration: '45 mins', objectives: [''], activities: [''],
  resources: [''], homework: '', status: 'draft',
}

export default function LessonPlanSection() {
  const queryClient = useQueryClient()

  const [selectedPlan,  setSelectedPlan]  = useState<LessonPlan | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [viewMode,      setViewMode]      = useState<'grid' | 'weekly'>('grid')
  const [filterGroup,   setFilterGroup]   = useState('all')
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [form,          setForm]          = useState<FormData>(EMPTY_FORM)

  // ── Fetch groups ──────────────────────────────────────────────────────────
  const { data: groups = [] } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn:  () => teacherApi.getGroups().then(r => r.data),
  })

  // Unique sections (teacher may have same section with multiple subjects)
  const uniqueGroups = groups.filter((g: any, i: number, arr: any[]) =>
    arr.findIndex((x: any) => x.id === g.id) === i
  )

  // Set defaults once groups load
  useEffect(() => {
    if (uniqueGroups.length > 0 && !form.class_section_id) {
      const first = uniqueGroups[0] as any
      setForm(f => ({ ...f, class_section_id: Number(first.id), subject_id: first.subject_id ?? 0 }))
    }
  }, [uniqueGroups.length])

  // Subjects for selected section
  const subjectsForSection = (sectionId: number) =>
    groups.filter((g: any) => Number(g.id) === sectionId)

  // ── Fetch lesson plans ────────────────────────────────────────────────────
  const { data: plans = [], isLoading } = useQuery<LessonPlan[]>({
    queryKey: ['lesson-plans'],
    queryFn:  () => teacherApi.getLessonPlans().then(r => r.data),
  })

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: FormData) => teacherApi.createLessonPlan(data),
    onSuccess: () => {
      toast.success('Lesson plan created!')
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['lesson-plans'] })
    },
    onError: () => toast.error('Failed to create lesson plan.'),
  })

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
      teacherApi.updateLessonPlan(id, data),
    onSuccess: () => {
      toast.success('Lesson plan updated!')
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['lesson-plans'] })
    },
    onError: () => toast.error('Failed to update.'),
  })

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherApi.deleteLessonPlan(id),
    onSuccess: () => {
      toast.success('Lesson plan deleted.')
      setSelectedPlan(null)
      queryClient.invalidateQueries({ queryKey: ['lesson-plans'] })
    },
    onError: () => toast.error('Failed to delete.'),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM) }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      class_section_id: uniqueGroups[0] ? Number((uniqueGroups[0] as any).id) : 0,
      subject_id:       uniqueGroups[0] ? ((uniqueGroups[0] as any).subject_id ?? 0) : 0,
    })
    setShowModal(true)
  }

  const openEdit = (plan: LessonPlan) => {
    setEditingId(plan.id)
    setForm({
      title:            plan.title,
      subject_id:       plan.subject_id,
      class_section_id: plan.section_id,
      week_label:       plan.week,
      day:              plan.day,
      period_number:    plan.period,
      duration:         plan.duration,
      objectives:       plan.objectives?.length ? [...plan.objectives] : [''],
      activities:       plan.activities?.length ? [...plan.activities] : [''],
      resources:        plan.resources?.length  ? [...plan.resources]  : [''],
      homework:         plan.homework ?? '',
      status:           plan.status,
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.week_label.trim()) { toast.error('Week label is required.'); return }

    // Clean empty list items
    const cleaned: FormData = {
      ...form,
      objectives: form.objectives.filter(v => v.trim()),
      activities: form.activities.filter(v => v.trim()),
      resources:  form.resources.filter(v => v.trim()),
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: cleaned })
    } else {
      createMutation.mutate(cleaned)
    }
  }

  const handleDelete = (plan: LessonPlan) => {
    if (!confirm(`Delete "${plan.title}"?`)) return
    deleteMutation.mutate(plan.id)
  }

  // List helpers
  const addItem    = (f: 'objectives' | 'activities' | 'resources') =>
    setForm(prev => ({ ...prev, [f]: [...prev[f], ''] }))
  const updateItem = (f: 'objectives' | 'activities' | 'resources', i: number, v: string) =>
    setForm(prev => ({ ...prev, [f]: prev[f].map((x, j) => j === i ? v : x) }))
  const removeItem = (f: 'objectives' | 'activities' | 'resources', i: number) =>
    setForm(prev => ({ ...prev, [f]: prev[f].filter((_, j) => j !== i) }))

  // Filtering
  const filtered = plans.filter((p: LessonPlan) => {
    if (filterGroup  !== 'all' && p.group  !== filterGroup)  return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  })

  const weekly: Record<Day, LessonPlan[]> = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] }
  filtered.forEach((p: LessonPlan) => { if (weekly[p.day]) weekly[p.day].push(p) })

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader title="Lesson Plans"
        subtitle="Create and manage weekly lesson plans."
        action={{ label: 'New Lesson Plan', icon: <Plus size={14} />, onClick: openCreate }} />

      <div className="px-6 pb-8 space-y-4">
        {/* Filters */}
        <div className="card animate-in">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="select w-48">
                <option value="all">All Classes</option>
                {uniqueGroups.map((g: any) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="ml-auto">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                <button onClick={() => setViewMode('grid')}   className="px-3 py-2 text-xs font-medium" style={{ background: viewMode === 'grid'   ? '#C9A020' : 'white', color: viewMode === 'grid'   ? 'white' : '#6B6660' }}>Grid</button>
                <button onClick={() => setViewMode('weekly')} className="px-3 py-2 text-xs font-medium" style={{ background: viewMode === 'weekly' ? '#C9A020' : 'white', color: viewMode === 'weekly' ? 'white' : '#6B6660', borderLeft: '1px solid #E4E1D8' }}>Weekly</button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail view */}
        {selectedPlan ? (
          <div className="card animate-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-lg">{selectedPlan.title}</h2>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: STATUS_STYLE[selectedPlan.status]?.bg, color: STATUS_STYLE[selectedPlan.status]?.text }}>
                    {STATUS_STYLE[selectedPlan.status]?.label}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#6B6660' }}>
                  {selectedPlan.group} · {selectedPlan.subject} · {selectedPlan.day}, Period {selectedPlan.period} · {selectedPlan.duration}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selectedPlan)} className="btn-outline text-sm"><Edit2 size={14} /> Edit</button>
                <button onClick={() => handleDelete(selectedPlan)} className="btn-outline text-sm" style={{ color: '#EF4444', borderColor: '#EF4444' }}><Trash2 size={14} /></button>
                <button onClick={() => setSelectedPlan(null)} className="btn-outline text-sm"><X size={14} /> Close</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Learning Objectives</h3>
                <ul className="space-y-2">
                  {(selectedPlan.objectives ?? []).map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Activities</h3>
                <ul className="space-y-2">
                  {(selectedPlan.activities ?? []).map((act, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'rgba(201,160,32,0.15)', color: '#C9A020' }}>{i + 1}</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Resources</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedPlan.resources ?? []).map((res, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>{res}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Homework</h3>
                <p className="text-sm p-3 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>{selectedPlan.homework || 'None assigned'}</p>
              </div>
            </div>
          </div>

        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in stagger-2">
            {isLoading && <p className="col-span-full text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading...</p>}
            {!isLoading && filtered.map((plan: LessonPlan) => {
              const ss = STATUS_STYLE[plan.status] ?? STATUS_STYLE.draft
              return (
                <div key={plan.id} className="card-hover">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.text }}>{ss.label}</span>
                    <span className="text-xs ml-auto" style={{ color: '#6B6660' }}>{plan.week}</span>
                  </div>
                  <h3 className="font-bold text-base mb-2">{plan.title}</h3>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><BookOpen size={12} /> {plan.group} · {plan.subject}</div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><Clock     size={12} /> {plan.day}, Period {plan.period} · {plan.duration}</div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><CheckCircle2 size={12} /> {(plan.objectives ?? []).length} objectives</div>
                  </div>
                  <div className="h-px mb-3" style={{ background: '#E4E1D8' }} />
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPlan(plan)} className="btn-gold text-xs flex-1 justify-center flex items-center gap-1"><Eye size={12} /> View</button>
                    <button onClick={() => openEdit(plan)}        className="btn-outline text-xs px-3"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(plan)}    className="btn-outline text-xs px-3" style={{ color: '#EF4444' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              )
            })}
            {!isLoading && filtered.length === 0 && (
              <div className="col-span-full text-center py-12">
                <BookOpen size={32} className="mx-auto mb-2" style={{ color: '#E4E1D8' }} />
                <p className="font-semibold">No lesson plans yet</p>
                <p className="text-sm mt-1" style={{ color: '#6B6660' }}>Click "New Lesson Plan" to create your first one.</p>
              </div>
            )}
          </div>

        ) : (
          <div className="grid grid-cols-5 gap-3 animate-in stagger-2">
            {DAYS.map(day => (
              <div key={day} className="card" style={{ minHeight: 200 }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 pb-2" style={{ color: '#6B6660', borderBottom: '1px solid #E4E1D8' }}>{day}</h3>
                <div className="space-y-2">
                  {weekly[day].sort((a, b) => a.period - b.period).map(plan => {
                    const ss = STATUS_STYLE[plan.status] ?? STATUS_STYLE.draft
                    return (
                      <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                        className="w-full text-left p-2 rounded-lg hover:shadow-sm transition-all"
                        style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] font-bold" style={{ color: '#C9A020' }}>P{plan.period}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.text }}>{ss.label}</span>
                        </div>
                        <p className="text-xs font-semibold truncate">{plan.title}</p>
                        <p className="text-[10px] truncate" style={{ color: '#6B6660' }}>{plan.group}</p>
                      </button>
                    )
                  })}
                  {weekly[day].length === 0 && <p className="text-[10px] text-center py-4" style={{ color: '#6B6660' }}>No plans</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-2xl mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Lesson Plan' : 'New Lesson Plan'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input" placeholder="e.g. Introduction to Electromagnetic Waves" />
              </div>

              {/* Class + Subject */}
              {!editingId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class *</label>
                    <select value={form.class_section_id}
                      onChange={e => {
                        const id = Number(e.target.value)
                        const first = groups.find((g: any) => Number(g.id) === id) as any
                        setForm(f => ({ ...f, class_section_id: id, subject_id: first?.subject_id ?? 0 }))
                      }} className="select">
                      {uniqueGroups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject *</label>
                    <select value={form.subject_id}
                      onChange={e => setForm(f => ({ ...f, subject_id: Number(e.target.value) }))} className="select">
                      {subjectsForSection(form.class_section_id).map((g: any) => (
                        <option key={g.subject_id} value={g.subject_id}>{g.subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Day / Period / Duration / Week */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Day</label>
                  <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value as Day }))} className="select">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Period</label>
                  <input type="number" min={1} max={12} value={form.period_number}
                    onChange={e => setForm(f => ({ ...f, period_number: Number(e.target.value) }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Duration</label>
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="select">
                    <option>45 mins</option><option>60 mins</option><option>90 mins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Week *</label>
                  <input value={form.week_label} onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))}
                    className="input" placeholder="e.g. Week 5" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormData['status'] }))} className="select w-48">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Objectives */}
              <ListField label="Learning Objectives" items={form.objectives} field="objectives"
                onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} placeholder="e.g. Students will understand..." />

              {/* Activities */}
              <ListField label="Activities" items={form.activities} field="activities"
                onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} placeholder="e.g. Group discussion..." />

              {/* Resources */}
              <ListField label="Resources" items={form.resources} field="resources"
                onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} placeholder="e.g. Textbook, Chapter 5" />

              {/* Homework */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Homework</label>
                <textarea value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))}
                  className="input" rows={3} placeholder="Describe homework or assignment..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={!form.title || isSaving} className="btn-gold">
                <Save size={14} />
                {isSaving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-component: list field with add/remove ──────────────────────────────
function ListField({ label, items, field, onAdd, onUpdate, onRemove, placeholder }: {
  label: string
  items: string[]
  field: 'objectives' | 'activities' | 'resources'
  onAdd:    (f: 'objectives' | 'activities' | 'resources') => void
  onUpdate: (f: 'objectives' | 'activities' | 'resources', i: number, v: string) => void
  onRemove: (f: 'objectives' | 'activities' | 'resources', i: number) => void
  placeholder: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>{label}</label>
        <button type="button" onClick={() => onAdd(field)} className="text-xs font-medium" style={{ color: '#C9A020' }}>+ Add</button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input value={item} onChange={e => onUpdate(field, i, e.target.value)}
            className="input flex-1" placeholder={`${placeholder} ${i + 1}`} />
          {items.length > 1 && (
            <button type="button" onClick={() => onRemove(field, i)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          )}
        </div>
      ))}
    </div>
  )
}
