'use client'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { adminMockDb } from '@/lib/admin-mock-db'
import { MapPin, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getClassLevelsFromDirectory, getSectionsFromDirectory } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
type Day = typeof DAYS[number]

const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '10:30 AM'] as const
type Time = typeof TIMES[number]

type Subject = {
  id: string
  code: string
  name: string
  type: string
  teacher: string
  max_marks: string
}

type TimetableCell = {
  subjectId: string
  subject: string
  teacher: string
  room: string
}

type TimetableByKey = Record<string, Record<Day, Partial<Record<Time, TimetableCell>>>>

type ClassNode = { id: string; name: string; sections: Array<{ id: string; name: string }> }

const DEFAULT_CLASSES = adminMockDb.academic_classes.map((c) => c.name.replace(/^Class\s+/i, 'Grade '))

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export default function TimetablePage() {
  const [activeDay, setActiveDay] = useState<Day>('Monday')
  const [hasMounted, setHasMounted] = useState(false)
  const [cls, setCls] = useState<string>('')
  const [section, setSection] = useState<string>('')
  const [subjectsByKey, setSubjectsByKey] = useState<Record<string, Subject[]>>({})
  const [timetableByKey, setTimetableByKey] = useState<TimetableByKey>({})

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const classes = useMemo<ClassNode[]>(() => {
    const fallback: ClassNode[] = adminMockDb.academic_classes.map((c) => ({
      id: c.id,
      name: c.name,
      sections: adminMockDb.academic_sections.filter((s) => s.class_id === c.id).map((s) => ({ id: s.id, name: s.name })),
    }))

    if (!hasMounted) return fallback

    const levels = getClassLevelsFromDirectory(DEFAULT_CLASSES)
    if (!levels.length) return fallback

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
    return out.length ? out : fallback
  }, [hasMounted])

  const currentClass = useMemo(() => classes.find((c) => c.id === cls) ?? null, [classes, cls])

  useEffect(() => {
    if (!classes.length) return
    setCls((prev) => (classes.some((c) => c.id === prev) ? prev : classes[0].id))
  }, [classes])

  useEffect(() => {
    const current = classes.find((c) => c.id === cls)
    if (!current) return
    setSection((prev) => (current.sections.some((s) => s.id === prev) ? prev : current.sections[0]?.id ?? ''))
  }, [classes, cls])

  const key = useMemo(() => `${cls}:${section}`, [cls, section])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem('edu_subjects_by_class_section_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object') setSubjectsByKey(parsed as Record<string, Subject[]>)
      }
    } catch {
      // ignore
    }

    try {
      const raw = window.localStorage.getItem('edu_timetable_by_class_section_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object') setTimetableByKey(parsed as TimetableByKey)
      }
    } catch {
      // ignore
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem('edu_timetable_by_class_section_v1', JSON.stringify(timetableByKey))
    } catch {
      // ignore
    }
  }, [hasMounted, timetableByKey])

  const availableSubjects = subjectsByKey[key] ?? []

  const [showEdit, setShowEdit] = useState(false)
  const [editDay, setEditDay] = useState<Day>('Monday')
  const [editTime, setEditTime] = useState<Time>('08:00 AM')
  const [editSubjectId, setEditSubjectId] = useState<string>('')
  const [editTeacher, setEditTeacher] = useState('')
  const [editRoom, setEditRoom] = useState('')

  const openEdit = (day: Day, time: Time) => {
    const cell = timetableByKey[key]?.[day]?.[time]
    setEditDay(day)
    setEditTime(time)
    setEditSubjectId(cell?.subjectId ?? '')
    setEditTeacher(cell?.teacher ?? '')
    setEditRoom(cell?.room ?? '')
    setShowEdit(true)
  }

  const saveEdit = () => {
    const subjectId = editSubjectId.trim()
    const subject = subjectId ? availableSubjects.find((s) => s.id === subjectId) : null
    const subjectName = subject ? subject.name : 'Free Period'

    setTimetableByKey((prev) => {
      const next: TimetableByKey = { ...prev }
      const perKey = { ...(next[key] ?? {}) }
      const perDay = { ...(perKey[editDay] ?? {}) }
      perDay[editTime] = {
        subjectId,
        subject: subjectName,
        teacher: editTeacher.trim() || (subject?.teacher ?? ''),
        room: editRoom.trim(),
      }
      perKey[editDay] = perDay
      next[key] = perKey
      return next
    })

    setShowEdit(false)
    toast.success('Timetable updated.')
  }

  const generateTimetable = () => {
    if (availableSubjects.length === 0) {
      toast.error('No subjects found for this class/section. Add subjects in Academics first.')
      return
    }

    const lessonTimes = TIMES.filter((t) => t !== '10:00 AM')
    const baseRoom = 'Room 101'

    setTimetableByKey((prev) => {
      const next: TimetableByKey = { ...prev }
      const perKey: Record<Day, Partial<Record<Time, TimetableCell>>> = { ...(next[key] ?? {}) }
      let idx = 0

      for (const day of DAYS) {
        const perDay: Partial<Record<Time, TimetableCell>> = { ...(perKey[day] ?? {}) }
        for (const time of lessonTimes) {
          const subj = availableSubjects[idx % availableSubjects.length]
          perDay[time] = {
            subjectId: subj.id,
            subject: subj.name,
            teacher: subj.teacher ?? '',
            room: baseRoom,
          }
          idx += 1
        }
        perKey[day] = perDay
      }

      next[key] = perKey
      return next
    })

    toast.success('Timetable generated.')
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Entry', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Master Timetable</h1>
        <p className="page-subtitle">Manage and view schedules across all departments.</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Filter + Day Selector */}
        <div className="card animate-in stagger-1">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
                <select value={cls} onChange={e => setCls(e.target.value)} className="select w-36">
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Section</label>
                <select value={section} onChange={e => setSection(e.target.value)} className="select w-48">
                  {(currentClass?.sections ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button key={day} onClick={() => setActiveDay(day)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: activeDay === day ? '#C9A020' : 'transparent',
                          color: activeDay === day ? 'white' : '#6B6660',
                          border: activeDay === day ? 'none' : '1px solid #E4E1D8',
                        }}>
                  {day}
                </button>
              ))}
            </div>
            <button className="btn-gold flex items-center gap-1.5" onClick={generateTimetable}>
              <Sparkles size={14} /> Generate Timetable
            </button>
          </div>
          <div className="mt-3 text-xs" style={{ color: '#6B6660' }}>
            Subjects for this class: <span className="font-semibold">{hasMounted ? availableSubjects.length : 0}</span>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="card p-0 overflow-hidden animate-in stagger-2">
          <div className="overflow-x-auto">
            <table style={{ minWidth: 900, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F7F6F3' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660', width: 90, borderBottom: '1px solid #E4E1D8' }}>Time</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660', borderBottom: '1px solid #E4E1D8' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time) => {
                  const isBreakRow = time === '10:00 AM'
                  if (isBreakRow) {
                    return (
                      <tr key={time} style={{ background: '#F7F6F3' }}>
                        <td className="px-4 py-2 text-xs font-mono" style={{ color: '#A09080', borderBottom: '1px solid #E4E1D8' }}>{time}</td>
                        <td colSpan={5} className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6660', borderBottom: '1px solid #E4E1D8' }}>
                          ☕ Morning Break
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={time} style={{ borderBottom: '1px solid #E4E1D8' }}>
                      <td className="px-4 py-3 text-xs font-mono align-top pt-4" style={{ color: '#A09080' }}>{time}</td>
                      {DAYS.map(day => {
                        const entry = timetableByKey[key]?.[day]?.[time]
                        const isFree = !entry || (!entry.subjectId && entry.subject === 'Free Period')
                        const subjectText = entry?.subject ?? '—'
                        const teacherText = entry?.teacher ?? ''
                        const roomText = entry?.room ?? ''

                        return (
                          <td key={day} className="px-3 py-3">
                            <div
                              onClick={() => openEdit(day, time)}
                              className="rounded-xl p-3 transition-all hover:shadow-md cursor-pointer relative"
                              style={{
                                background: 'white',
                                border: '1px solid #E4E1D8',
                                opacity: isFree ? 0.85 : 1,
                              }}
                            >
                              <p className="font-bold text-sm mb-1">{subjectText}</p>
                              {teacherText ? <p className="text-xs mb-1.5" style={{ color: '#6B6660' }}>{teacherText}</p> : null}
                              {roomText ? (
                                <div className="flex items-center gap-1 text-xs" style={{ color: '#A09080' }}>
                                  <MapPin size={10} /> {roomText}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Edit Timetable Slot</h2>
              <button onClick={() => setShowEdit(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Day</label>
                <input value={editDay} readOnly className="input" />
              </div>
              <div>
                <label className="label">Time</label>
                <input value={editTime} readOnly className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Subject</label>
                <select
                  value={editSubjectId}
                  onChange={(e) => {
                    const value = e.target.value
                    setEditSubjectId(value)
                    const subj = value ? availableSubjects.find((s) => s.id === value) : null
                    if (subj && !editTeacher.trim()) setEditTeacher(subj.teacher ?? '')
                  }}
                  className="select"
                >
                  <option value="">Free Period</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Teacher</label>
                <input value={editTeacher} onChange={(e) => setEditTeacher(e.target.value)} className="input" placeholder="e.g. Sarah Jenkins" />
              </div>
              <div>
                <label className="label">Room</label>
                <input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} className="input" placeholder="e.g. Room 204" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={saveEdit} className="btn-gold px-10">Save</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
