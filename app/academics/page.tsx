'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { academicsApi } from '@/lib/api'
import { adminMockDb } from '@/lib/admin-mock-db'
import { FolderOpen, Pencil, Plus, Trash2, Trophy, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getClassLevelsFromDirectory, getSectionsFromDirectory } from '@/lib/utils'

const MOCK_CLASSES = [
  { id: 'c10', name: 'Class 10', sections: [{ id: 's10a', name: 'Section A' }, { id: 's10b', name: 'Section B' }] },
  { id: 'c11', name: 'Class 11', sections: [{ id: 's11a', name: 'Section A' }] },
  { id: 'c12', name: 'Class 12', sections: [{ id: 's12a', name: 'Section A' }] },
]
const MOCK_SUBJECTS = [
  { id: 's1', code: 'MAT101', type: 'Core', name: 'Advanced Mathematics', teacher: 'Dr. Robert Chen', max_marks: '100 (Theory) / 50 (Practical)' },
  { id: 's2', code: 'PHY101', type: 'Core', name: 'Physics Fundamentals', teacher: 'Sarah Jenkins', max_marks: '100 (Theory)' },
  { id: 's3', code: 'ENG102', type: 'Language', name: 'English Literature', teacher: 'Prof. Alan Smith', max_marks: '100 (Theory)' },
]
const typeStyle: Record<string, string> = {
  Core: 'badge-green', Language: 'badge-gold', Elective: 'badge-blue',
}

type Subject = {
  id: string
  code: string
  type: string
  name: string
  teacher: string
  max_marks: string
}

type ClassNode = { id: string; name: string; sections: Array<{ id: string; name: string }> }

const DEFAULT_CLASSES = MOCK_CLASSES.map((c) => c.name.replace(/^Class\s+/i, 'Grade '))

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export default function AcademicsPage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [selectedClass, setSelectedClass] = useState('c10')
  const [selectedSection, setSelectedSection] = useState('s10a')

  const { data: classesFromApi = MOCK_CLASSES } = useQuery({
    queryKey: ['classes'],
    queryFn: () => academicsApi.getClasses().then((r) => r.data),
    placeholderData: MOCK_CLASSES,
  })

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const classes = useMemo<ClassNode[]>(() => {
    if (!hasMounted) return classesFromApi as unknown as ClassNode[]
    const levels = getClassLevelsFromDirectory(DEFAULT_CLASSES)
    if (!levels.length) return classesFromApi as unknown as ClassNode[]

    const out: ClassNode[] = []
    for (const level of levels) {
      const m = String(level).match(/(\d+)/)
      const classId = m ? `c${m[1]}` : `c_${normalizeKey(level)}`
      const secNames = getSectionsFromDirectory(level)
      const sections =
        secNames.length > 0
          ? secNames.map((secName) => {
              const matchLetter = String(secName).match(/section\s+([a-z])\b/i)
              if (m && matchLetter) {
                const letter = matchLetter[1].toLowerCase()
                return { id: `s${m[1]}${letter}`, name: `Section ${letter.toUpperCase()}` }
              }
              return { id: `s_${normalizeKey(`${level}_${secName}`)}`, name: secName }
            })
          : [{ id: `s_${normalizeKey(`${level}_section_a`)}`, name: 'Section A' }]

      out.push({ id: classId, name: level, sections })
    }
    return out.length ? out : (classesFromApi as unknown as ClassNode[])
  }, [classesFromApi, hasMounted])

  useEffect(() => {
    if (!classes.length) return
    setSelectedClass((prev) => (classes.some((c) => c.id === prev) ? prev : classes[0].id))
  }, [classes])

  useEffect(() => {
    const current = classes.find((c) => c.id === selectedClass)
    if (!current) return
    setSelectedSection((prev) => (current.sections.some((s) => s.id === prev) ? prev : current.sections[0]?.id ?? ''))
  }, [classes, selectedClass])

  const currentClass = classes.find((c) => c.id === selectedClass)
  const currentSectionName = currentClass?.sections.find((s) => s.id === selectedSection)?.name

  const key = useMemo(() => `${selectedClass}:${selectedSection}`, [selectedClass, selectedSection])
  const [subjectsByKey, setSubjectsByKey] = useState<Record<string, Subject[]>>(() => ({
    ['c10:s10a']: MOCK_SUBJECTS.map((s) => ({ ...s })),
  }))

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem('edu_subjects_by_class_section_v1')
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object') return
      setSubjectsByKey((prev) => ({ ...prev, ...(parsed as Record<string, Subject[]>) }))
    } catch {
      // ignore
    }
  }, [hasMounted])

  useEffect(() => {
    setSubjectsByKey((prev) => {
      if (prev[key]) return prev
      return { ...prev, [key]: MOCK_SUBJECTS.map((s) => ({ ...s })) }
    })
  }, [key])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem('edu_subjects_by_class_section_v1', JSON.stringify(subjectsByKey))
    } catch {
      // ignore
    }
  }, [hasMounted, subjectsByKey])

  const subjects = subjectsByKey[key] ?? []

  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('Core')
  const [formTeacher, setFormTeacher] = useState('')
  const [formMaxMarks, setFormMaxMarks] = useState('')
  const teacherOptions = useMemo(() => {
    const base = adminMockDb.teachers.map((t) => t.name)
    const seen = new Set<string>()
    const options: string[] = []

    for (const name of [...base, ...subjects.map((s) => s.teacher), formTeacher]) {
      const value = (name ?? '').toString().trim()
      if (!value) continue
      if (seen.has(value)) continue
      seen.add(value)
      options.push(value)
    }

    return options.sort((a, b) => a.localeCompare(b))
  }, [formTeacher, subjects])

  const openAddSubject = () => {
    setEditingSubjectId(null)
    setFormCode('')
    setFormName('')
    setFormType('Core')
    setFormTeacher('')
    setFormMaxMarks('')
    setShowSubjectModal(true)
  }

  const openEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id)
    setFormCode(subject.code)
    setFormName(subject.name)
    setFormType(subject.type)
    setFormTeacher(subject.teacher)
    setFormMaxMarks(subject.max_marks)
    setShowSubjectModal(true)
  }

  const closeSubjectModal = () => {
    setShowSubjectModal(false)
  }

  const saveSubject = () => {
    const code = formCode.trim()
    const name = formName.trim()
    const type = formType.trim()
    const teacher = formTeacher.trim()
    const maxMarks = formMaxMarks.trim()

    if (!code || !name) {
      toast.error('Please fill Subject Code and Subject Name.')
      return
    }

    setSubjectsByKey((prev) => {
      const list = prev[key] ?? []
      const existingCodeIndex = list.findIndex((s) => s.code.toLowerCase() === code.toLowerCase())

      if (editingSubjectId) {
        const updated = list.map((s) =>
          s.id === editingSubjectId
            ? { ...s, code, name, type, teacher, max_marks: maxMarks }
            : s
        )
        return { ...prev, [key]: updated }
      }

      if (existingCodeIndex !== -1) {
        toast.error('A subject with this code already exists.')
        return prev
      }

      const newSubject: Subject = {
        id: `sub_${Date.now()}`,
        code,
        name,
        type,
        teacher,
        max_marks: maxMarks,
      }
      return { ...prev, [key]: [newSubject, ...list] }
    })

    toast.success(editingSubjectId ? 'Subject updated.' : 'Subject added.')
    setShowSubjectModal(false)
  }

  const deleteSubject = (id: string) => {
    if (!window.confirm('Delete this subject?')) return
    setSubjectsByKey((prev) => {
      const list = prev[key] ?? []
      return { ...prev, [key]: list.filter((s) => s.id !== id) }
    })
    toast.success('Subject deleted.')
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Entry', onClick: () => {} }} />

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
              {classes.map((cls) => (
                <div key={cls.id}>
                  <button
                    onClick={() => { setSelectedClass(cls.id); setSelectedSection(cls.sections[0]?.id) }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left hover:bg-gray-50 transition-colors">
                    <FolderOpen size={14} style={{ color: '#6B6660' }} />
                    <span className="font-medium">{cls.name}</span>
                  </button>
                  {selectedClass === cls.id && cls.sections.map((sec) => (
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

          {/* Subjects Table */}
          <div className="flex-1 animate-in stagger-2">
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-bold text-lg">
                    Subjects for {currentClass?.name} – {currentSectionName}
                  </h2>
                  <div className="text-sm mt-1" style={{ color: '#6B6660' }}>
                    {subjects.length} Active Subjects
                  </div>
                </div>

                <button className="btn-gold text-sm flex items-center gap-1.5" onClick={openAddSubject}>
                  <Plus size={14} />
                  Add Subject
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: '#6B6660' }}>
                  No subjects found for this class/section.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Teacher</th>
                        <th>Max Marks</th>
                        <th style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub) => (
                        <tr key={sub.id}>
                          <td>
                            <span className="badge badge-gray text-xs font-mono">{sub.code}</span>
                          </td>
                          <td>
                            <div className="font-semibold">{sub.name}</div>
                          </td>
                          <td>
                            <span className={`badge ${typeStyle[sub.type] || 'badge-gray'}`}>{sub.type}</span>
                          </td>
                          <td>
                            {sub.teacher ? (
                              <div className="flex items-center gap-1.5">
                                <User size={13} style={{ color: '#C9A020' }} />
                                <span className="font-medium">{sub.teacher}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#6B6660' }}>—</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Trophy size={13} style={{ color: '#C9A020' }} />
                              <span className="font-medium">{sub.max_marks}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                className="btn-outline px-2 py-1.5 text-xs flex items-center gap-1"
                                onClick={() => openEditSubject(sub)}
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                className="btn-outline px-2 py-1.5 text-xs flex items-center gap-1"
                                style={{ borderColor: '#FCA5A5', color: '#EF4444' }}
                                onClick={() => deleteSubject(sub.id)}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingSubjectId ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={closeSubjectModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Subject Code</label>
                <input value={formCode} onChange={(e) => setFormCode(e.target.value)} className="input" placeholder="e.g. MAT101" />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="select">
                  <option>Core</option>
                  <option>Language</option>
                  <option>Elective</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Subject Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input" placeholder="e.g. Advanced Mathematics" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Teacher</label>
                <select value={formTeacher} onChange={(e) => setFormTeacher(e.target.value)} className="select">
                  <option value="">Unassigned</option>
                  {teacherOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Max Marks</label>
                <input value={formMaxMarks} onChange={(e) => setFormMaxMarks(e.target.value)} className="input" placeholder="e.g. 100 (Theory) / 50 (Practical)" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeSubjectModal} className="btn-outline px-8">Cancel</button>
              <button onClick={saveSubject} className="btn-gold px-10">
                {editingSubjectId ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
