'use client'

import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { CalendarDays, CheckCircle2, Search, XCircle } from 'lucide-react'

type WeeklyStatus = 'present' | 'absent'

const MOCK_STUDENTS = [
  { id: 'student-001', name: 'Chidinma Okafor', avatar: 'CO', class_id: 'class-ss2' },
  { id: 'student-002', name: 'Emeka Okafor', avatar: 'EO', class_id: 'class-jss1' },
  { id: 'student-003', name: 'Blessing Okafor', avatar: 'BO', class_id: 'class-pry4' },
]

const classes = [
  { id: 'class-ss2', name: 'SS2' },
  { id: 'class-jss1', name: 'JSS1' },
  { id: 'class-pry4', name: 'Primary 4' },
]

function toIso(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getMonday(date = new Date()) {
  const next = new Date(date)
  const day = next.getDay() || 7
  next.setDate(next.getDate() - day + 1)
  return next
}

function addDays(value: string, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('class-ss2')
  const [weekStart, setWeekStart] = useState(toIso(getMonday()))
  const [attendance, setAttendance] = useState<Record<string, { status: WeeklyStatus; teacher_notes: string }>>({})
  const [report, setReport] = useState<Array<{ id: string; student_id: string; status: WeeklyStatus; teacher_notes: string; student?: { name: string } }>>([])
  const [query, setQuery] = useState('')
  const weekEnd = addDays(weekStart, 6)

  const classStudents = useMemo(
    () => MOCK_STUDENTS.filter((student) => student.class_id === selectedClass && student.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, selectedClass],
  )

  const counts = useMemo(() => {
    return classStudents.reduce(
      (acc, student) => {
        const status = attendance[student.id]?.status || 'present'
        acc[status] += 1
        return acc
      },
      { present: 0, absent: 0 },
    )
  }, [attendance, classStudents])

  const loadWeeklyReport = async () => {
    const response = await fetch(`/api/attendance/weekly?class=${encodeURIComponent(selectedClass)}&weekStart=${encodeURIComponent(weekStart)}`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'Unable to load weekly attendance.')

    setReport(payload.data || [])
    const loaded = Object.fromEntries((payload.data || []).map((record: { student_id: string; status: WeeklyStatus; teacher_notes: string }) => [
      record.student_id,
      { status: record.status, teacher_notes: record.teacher_notes || '' },
    ]))
    setAttendance((current) => ({ ...Object.fromEntries(classStudents.map((student) => [student.id, { status: 'present' as WeeklyStatus, teacher_notes: '' }])), ...loaded }))
  }

  useEffect(() => {
    setAttendance(Object.fromEntries(classStudents.map((student) => [student.id, { status: 'present' as WeeklyStatus, teacher_notes: '' }])))
  }, [selectedClass])

  useEffect(() => {
    loadWeeklyReport().catch((error) => toast.error(error.message))
  }, [selectedClass, weekStart])

  const setStatus = (studentId: string, status: WeeklyStatus) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: { status, teacher_notes: current[studentId]?.teacher_notes || '' },
    }))
  }

  const setNotes = (studentId: string, teacher_notes: string) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: { status: current[studentId]?.status || 'present', teacher_notes },
    }))
  }

  const markAll = (status: WeeklyStatus) => {
    setAttendance(Object.fromEntries(classStudents.map((student) => [student.id, { status, teacher_notes: attendance[student.id]?.teacher_notes || '' }])))
  }

  const saveWeeklyAttendance = async () => {
    const response = await fetch('/api/attendance/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: selectedClass,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        records: classStudents.map((student) => ({
          student_id: student.id,
          status: attendance[student.id]?.status || 'present',
          teacher_notes: attendance[student.id]?.teacher_notes || '',
        })),
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(payload.message || 'Unable to save weekly attendance.')
      return
    }

    setReport(payload.data || [])
    toast.success('Weekly attendance saved.')
  }

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Weekly Attendance</h1>
        <p className="page-subtitle">Mark student attendance for the selected Monday-Sunday week.</p>
      </div>

      <div className="space-y-4 px-6 pb-8">
        <div className="card">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Class</span>
              <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} className="select">
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Week Start</span>
              <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="input" />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Search Students</span>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-9" placeholder="Search by student name" />
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold">Class Attendance Register</h2>
                <p className="text-xs" style={{ color: '#6B6660' }}>{weekStart} to {weekEnd}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => markAll('present')} className="btn-outline text-xs" style={{ borderColor: '#10B981', color: '#10B981' }}>Mark All Present</button>
                <button type="button" onClick={() => markAll('absent')} className="btn-outline text-xs" style={{ borderColor: '#EF4444', color: '#EF4444' }}>Mark All Absent</button>
              </div>
            </div>

            <div className="table-wrapper rounded-lg border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Teacher Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => {
                    const current = attendance[student.id]?.status || 'present'
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: '#C9A020' }}>{student.avatar}</div>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {(['present', 'absent'] as WeeklyStatus[]).map((status) => (
                              <button
                                key={status}
                                onClick={() => setStatus(student.id, status)}
                                className="rounded-md px-3 py-1.5 text-xs font-bold capitalize"
                                style={{
                                  background: current === status ? (status === 'present' ? '#10B981' : '#EF4444') : '#F7F6F3',
                                  color: current === status ? '#FFFFFF' : '#6B6660',
                                }}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input value={attendance[student.id]?.teacher_notes || ''} onChange={(event) => setNotes(student.id, event.target.value)} className="input py-1.5 text-sm" placeholder="Optional note" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays size={18} style={{ color: '#C9A020' }} />
                <h3 className="font-bold">Weekly Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: '#ECFDF5' }}>
                  <CheckCircle2 className="mx-auto mb-2" size={20} color="#10B981" />
                  <p className="text-2xl font-bold" style={{ color: '#065F46' }}>{counts.present}</p>
                  <p className="text-xs" style={{ color: '#065F46' }}>Present</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: '#FEF2F2' }}>
                  <XCircle className="mx-auto mb-2" size={20} color="#EF4444" />
                  <p className="text-2xl font-bold" style={{ color: '#991B1B' }}>{counts.absent}</p>
                  <p className="text-xs" style={{ color: '#991B1B' }}>Absent</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6660' }}>Saved Weekly Report</h3>
              <div className="space-y-2">
                {report.length === 0 && <p className="text-sm" style={{ color: '#6B6660' }}>No saved records for this week yet.</p>}
                {report.map((record) => (
                  <div key={record.id} className="flex justify-between gap-3 rounded-md px-3 py-2" style={{ background: '#F7F6F3' }}>
                    <span className="text-sm">{record.student?.name || record.student_id}</span>
                    <span className="text-xs font-bold capitalize" style={{ color: record.status === 'present' ? '#10B981' : '#EF4444' }}>{record.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={saveWeeklyAttendance} className="btn-gold">Save Weekly Attendance</button>
        </div>
      </div>
    </AppLayout>
  )
}
