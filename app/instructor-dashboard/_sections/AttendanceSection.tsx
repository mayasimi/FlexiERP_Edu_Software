'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { MOCK_GROUPS, MOCK_GROUP_STUDENTS } from '../_mock-data'

type WeeklyStatus = 'present' | 'absent'

const getMondayIso = () => {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

const addDays = (isoDate: string, days: number) => {
  const date = new Date(isoDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function AttendanceSection() {
  const [selectedGroup, setSelectedGroup] = useState(MOCK_GROUPS[0]?.id || '')
  const [weekStart, setWeekStart] = useState(getMondayIso())
  const [attendance, setAttendance] = useState<Record<string, { status: WeeklyStatus; notes: string }>>(
    Object.fromEntries(MOCK_GROUP_STUDENTS.map((student) => [student.id, { status: 'present', notes: '' }])),
  )

  const group = MOCK_GROUPS.find((item) => item.id === selectedGroup) || MOCK_GROUPS[0]
  const weekEnd = addDays(weekStart, 6)

  const counts = useMemo(() => {
    return MOCK_GROUP_STUDENTS.reduce(
      (acc, student) => {
        const status = attendance[student.id]?.status || 'present'
        acc[status] += 1
        return acc
      },
      { present: 0, absent: 0 },
    )
  }, [attendance])

  const setStatus = (studentId: string, status: WeeklyStatus) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: { status, notes: current[studentId]?.notes || '' },
    }))
  }

  const setNotes = (studentId: string, notes: string) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: { status: current[studentId]?.status || 'present', notes },
    }))
  }

  const markAll = (status: WeeklyStatus) => {
    setAttendance(Object.fromEntries(MOCK_GROUP_STUDENTS.map((student) => [
      student.id,
      { status, notes: attendance[student.id]?.notes || '' },
    ])))
  }

  const saveAttendance = () => {
    toast.success('Weekly attendance saved.')
  }

  return (
    <div>
      <PageHeader title="Weekly Attendance" subtitle="Mark attendance for a full Monday-Sunday week." />

      <div className="px-6 pb-8 space-y-4">
        <div className="card animate-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class / Group</label>
              <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="select">
                {MOCK_GROUPS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
              <input value={group?.subject || ''} readOnly className="input" style={{ background: '#F7F6F3' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Week Start</label>
              <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="card xl:col-span-2 animate-in stagger-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-base">{group?.name || 'Class'} Attendance</h2>
                <p className="text-xs mt-1" style={{ color: '#6B6660' }}>{weekStart} to {weekEnd}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#10B981', color: '#10B981' }}>Mark All Present</button>
                <button onClick={() => markAll('absent')} className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#EF4444', color: '#EF4444' }}>Mark All Absent</button>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Roll No.</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Teacher Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_GROUP_STUDENTS.map((student) => {
                    const current = attendance[student.id]?.status || 'present'
                    return (
                      <tr key={student.id}>
                        <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{student.rollNo}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar initials={student.avatar} />
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
                          <input
                            value={attendance[student.id]?.notes || ''}
                            onChange={(event) => setNotes(student.id, event.target.value)}
                            className="input py-1.5 text-sm"
                            placeholder="Optional note"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 animate-in stagger-2">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
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
            <button type="button" onClick={saveAttendance} className="btn-gold w-full">Save Weekly Attendance</button>
          </div>
        </div>
      </div>
    </div>
  )
}
