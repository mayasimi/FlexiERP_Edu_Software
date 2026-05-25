'use client'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { Sparkles, MapPin, Pencil, X } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
type Day = typeof DAYS[number]

type StoredSubject = {
  id: string
  name: string
  teacher: string
  code?: string
  type?: string
}

type TimetableCell =
  | { kind: 'lesson'; id: string; subjectId: string; subject: string; teacher: string; room: string }
  | { kind: 'free'; id: string; label: string }

type TimetableGrid = Record<Day, Record<string, TimetableCell | null>>

const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '10:30 AM'] as const
const BREAK_TIME = '10:00 AM'
const SUBJECTS_STORAGE_KEY = 'flexierp_subjects'

function timetableStorageKey(cls: string, section: string) {
  return `flexierp_timetable_${cls}_${section}`.replace(/\s+/g, '_')
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export default function TimetablePage() {
  const [activeDay, setActiveDay] = useState<Day>('Monday')
  const [cls, setCls] = useState('Grade 10')
  const [section, setSection] = useState('Section A (Science)')
  const [grid, setGrid] = useState<TimetableGrid>(() => {
    const init: TimetableGrid = { Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} }
    DAYS.forEach(d => {
      TIMES.forEach(t => {
        init[d][t] = t === BREAK_TIME ? null : { kind: 'free', id: `${d}-${t}`, label: 'Free Period' }
      })
    })
    return init
  })
  const [editingSlot, setEditingSlot] = useState<{ day: Day; time: string } | null>(null)
  const [editSubjectId, setEditSubjectId] = useState<string>('__free__')
  const [editRoom, setEditRoom] = useState<string>('Room 101')

  const subjects = useMemo(() => {
    const parsed = safeJsonParse<StoredSubject[]>(typeof window !== 'undefined' ? localStorage.getItem(SUBJECTS_STORAGE_KEY) : null)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return [] as StoredSubject[]
  }, [])

  useEffect(() => {
    const saved = safeJsonParse<TimetableGrid>(localStorage.getItem(timetableStorageKey(cls, section)))
    if (saved) {
      setGrid(saved)
    }
  }, [cls, section])

  useEffect(() => {
    try {
      localStorage.setItem(timetableStorageKey(cls, section), JSON.stringify(grid))
    } catch {
      // ignore
    }
  }, [cls, section, grid])

  const handleGenerate = () => {
    const stored = safeJsonParse<StoredSubject[]>(localStorage.getItem(SUBJECTS_STORAGE_KEY)) || []
    if (stored.length === 0) {
      toast.error('No subjects found. Please add subjects in Academics first.')
      return
    }

    const newGrid: TimetableGrid = { Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} }
    let idx = 0
    DAYS.forEach(d => {
      TIMES.forEach(t => {
        if (t === BREAK_TIME) {
          newGrid[d][t] = null
          return
        }
        const s = stored[idx % stored.length]
        idx++
        newGrid[d][t] = {
          kind: 'lesson',
          id: `${d}-${t}`,
          subjectId: s.id,
          subject: s.name,
          teacher: s.teacher || 'Unassigned',
          room: 'Room 101',
        }
      })
    })
    setGrid(newGrid)
    toast.success(`Timetable generated for ${cls} • ${section}`)
  }

  const handleDragStart = (day: Day, time: string) => (e: React.DragEvent) => {
    const cell = grid[day][time]
    if (!cell || cell.kind !== 'lesson') return
    e.dataTransfer.setData('application/json', JSON.stringify({ fromDay: day, fromTime: time }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (day: Day, time: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (time === BREAK_TIME) return
    const raw = e.dataTransfer.getData('application/json')
    const parsed = safeJsonParse<{ fromDay: Day; fromTime: string }>(raw)
    if (!parsed) return
    const { fromDay, fromTime } = parsed
    if (fromDay === day && fromTime === time) return
    if (fromTime === BREAK_TIME) return

    setGrid(prev => {
      const fromCell = prev[fromDay][fromTime]
      const toCell = prev[day][time]
      const next: TimetableGrid = { ...prev, [fromDay]: { ...prev[fromDay] }, [day]: { ...prev[day] } }
      next[fromDay][fromTime] = toCell
      next[day][time] = fromCell
      return next
    })
  }

  const openEdit = (day: Day, time: string) => {
    if (time === BREAK_TIME) return
    const cell = grid[day][time]
    setEditingSlot({ day, time })
    if (!cell || cell.kind !== 'lesson') {
      setEditSubjectId('__free__')
      setEditRoom('Room 101')
      return
    }
    setEditSubjectId(cell.subjectId)
    setEditRoom(cell.room)
  }

  const saveEdit = () => {
    if (!editingSlot) return
    const { day, time } = editingSlot
    if (time === BREAK_TIME) return

    if (editSubjectId === '__free__') {
      setGrid(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [time]: { kind: 'free', id: `${day}-${time}`, label: 'Free Period' },
        },
      }))
      setEditingSlot(null)
      toast.success('Slot updated')
      return
    }

    const stored = safeJsonParse<StoredSubject[]>(localStorage.getItem(SUBJECTS_STORAGE_KEY)) || []
    const s = stored.find(x => x.id === editSubjectId)
    if (!s) {
      toast.error('Selected subject not found. Please refresh subjects.')
      return
    }

    setGrid(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [time]: {
          kind: 'lesson',
          id: `${day}-${time}`,
          subjectId: s.id,
          subject: s.name,
          teacher: s.teacher || 'Unassigned',
          room: editRoom || 'Room 101',
        },
      },
    }))
    setEditingSlot(null)
    toast.success('Slot updated')
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
                  <option>Grade 10</option><option>Grade 11</option><option>Grade 12</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Section</label>
                <select value={section} onChange={e => setSection(e.target.value)} className="select w-48">
                  <option>Section A (Science)</option><option>Section B (Arts)</option>
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
            <button onClick={handleGenerate} className="btn-gold flex items-center gap-1.5">
              <Sparkles size={14} /> Generate Timetable
            </button>
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
                  if (time === BREAK_TIME) {
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
                        const cell = grid[day][time]
                        return (
                          <td
                            key={day}
                            className="px-3 py-3"
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop(day, time)}
                          >
                            {cell?.kind === 'lesson' ? (
                              <div
                                draggable
                                onDragStart={handleDragStart(day, time)}
                                onClick={() => openEdit(day, time)}
                                className="rounded-xl p-3 transition-all hover:shadow-md cursor-pointer relative"
                                style={{ background: 'white', border: '1px solid #E4E1D8' }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(day, time) }}
                                  className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100"
                                  title="Edit slot"
                                >
                                  <Pencil size={12} style={{ color: '#6B6660' }} />
                                </button>
                                <p className="font-bold text-sm mb-1">{cell.subject}</p>
                                <p className="text-xs mb-1.5" style={{ color: '#6B6660' }}>{cell.teacher}</p>
                                <div className="flex items-center gap-1 text-xs" style={{ color: '#A09080' }}>
                                  <MapPin size={10} /> {cell.room}
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => openEdit(day, time)}
                                className="rounded-lg px-3 py-2.5 text-center text-xs cursor-pointer"
                                style={{ background: '#F7F6F3', color: '#6B6660', border: '1px dashed #E4E1D8' }}
                              >
                                Free Period
                              </div>
                            )}
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

      {editingSlot && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Timetable Slot</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{editingSlot.day} • {editingSlot.time}</p>
              </div>
              <button onClick={() => setEditingSlot(null)} className="p-2 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div>
                <label className="label">Subject</label>
                <select value={editSubjectId} onChange={e => setEditSubjectId(e.target.value)} className="select w-full">
                  <option value="__free__">Free Period</option>
                  {(safeJsonParse<StoredSubject[]>(localStorage.getItem(SUBJECTS_STORAGE_KEY)) || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Room</label>
                <input value={editRoom} onChange={e => setEditRoom(e.target.value)} className="input w-full" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingSlot(null)} className="btn-outline px-6">Cancel</button>
                <button onClick={saveEdit} className="btn-gold px-8">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
