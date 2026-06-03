'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import { Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../_components'
import { DAYS, type Day, type ScheduleEntry, type ScheduleSlot } from '../_types'

function isClassEntry(entry: ScheduleEntry): entry is ScheduleSlot {
  return !('type' in entry)
}

export default function ScheduleSection() {
  const [activeDay, setActiveDay] = useState<Day>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as Day
    return DAYS.includes(today) ? today : 'Monday'
  })

  // ── Fetch real weekly schedule from backend ───────────────────────────────
  const { data: weeklySchedule = {}, isLoading } = useQuery({
    queryKey: ['teacher-schedule'],
    queryFn:  () => teacherApi.getSchedule().then(r => r.data),
  })

  // Map API response to match ScheduleEntry shape the UI expects
  const mapSlots = (slots: any[]): ScheduleEntry[] =>
    slots.map(slot => {
      // Non-lesson slots (break, free period)
      if (slot.type && slot.type !== 'lesson') {
        return {
          id:    slot.id,
          time:  slot.time,
          type:  slot.type as 'break' | 'free',
          label: slot.label ?? (slot.type === 'break' ? 'Break' : 'Free Period'),
        }
      }
      // Class slots
      return {
        id:      slot.id,
        time:    slot.time,
        subject: slot.subject,
        group:   slot.group,
        room:    slot.room,
        batch:   slot.batch ?? null,
      } as ScheduleSlot
    })

  const daySchedule  = mapSlots((weeklySchedule as any)[activeDay] ?? [])
  const classCount   = daySchedule.filter(isClassEntry).length
  const freeCount    = daySchedule.filter(e => !isClassEntry(e) && (e as any).type === 'free').length

  return (
    <div>
      <PageHeader title="My Weekly Schedule" subtitle="Your teaching timetable with room and batch assignments." />

      <div className="px-6 pb-8 space-y-4">
        {/* Day Selector */}
        <div className="card animate-in stagger-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const idx = DAYS.indexOf(activeDay); if (idx > 0) setActiveDay(DAYS[idx - 1]) }}
                disabled={activeDay === 'Monday'}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30"
                style={{ border: '1px solid #E4E1D8' }}>
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-2">
                {DAYS.map(day => (
                  <button key={day} onClick={() => setActiveDay(day)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: activeDay === day ? '#C9A020' : 'transparent', color: activeDay === day ? 'white' : '#6B6660', border: activeDay === day ? 'none' : '1px solid #E4E1D8' }}>
                    {day}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { const idx = DAYS.indexOf(activeDay); if (idx < DAYS.length - 1) setActiveDay(DAYS[idx + 1]) }}
                disabled={activeDay === 'Friday'}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30"
                style={{ border: '1px solid #E4E1D8' }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: '#6B6660' }}>
              <span><strong>{classCount}</strong> classes</span>
              <span><strong>{freeCount}</strong> free</span>
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-3 animate-in stagger-2">
          {isLoading && (
            <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading schedule...</p>
          )}
          {!isLoading && daySchedule.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-sm" style={{ color: '#6B6660' }}>No classes scheduled for {activeDay}.</p>
            </div>
          )}
          {daySchedule.map(entry => {
            if (!isClassEntry(entry)) {
              const e      = entry as any
              const isFree = e.type === 'free'
              return (
                <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl"
                  style={{ background: isFree ? '#F3F4F6' : '#FEF3C7', border: `1px solid ${isFree ? '#E5E7EB' : '#FDE68A'}` }}>
                  <div className="text-sm font-mono w-20 flex-shrink-0" style={{ color: '#6B6660' }}>{e.time}</div>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isFree ? '#9CA3AF' : '#F59E0B' }} />
                  <p className="text-sm font-medium" style={{ color: isFree ? '#6B7280' : '#92400E' }}>
                    {isFree ? '📖 ' : '☕ '}{e.label}
                  </p>
                </div>
              )
            }
            return (
              <div key={entry.id} className="flex items-center gap-4 p-4 rounded-xl bg-white transition-all hover:shadow-md"
                style={{ border: '1px solid #E4E1D8' }}>
                <div className="text-sm font-mono w-20 flex-shrink-0" style={{ color: '#6B6660' }}>{entry.time}</div>
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: '#C9A020' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{entry.subject}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><Users size={12} /> {entry.group}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><MapPin  size={12} /> {entry.room}</span>
                    {entry.batch && <span className="badge badge-gold text-xs">{entry.batch}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly Overview Grid */}
        <div className="card p-0 overflow-hidden animate-in stagger-3 mt-6">
          <div className="p-4 border-b" style={{ borderColor: '#E4E1D8' }}>
            <h3 className="font-bold text-base">Weekly Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table style={{ minWidth: 700, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F7F6F3' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#6B6660', borderBottom: '1px solid #E4E1D8' }}>Time</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: d === activeDay ? '#C9A020' : '#6B6660', borderBottom: '1px solid #E4E1D8' }}>
                      {d.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['08:00 AM', '09:00 AM', '10:00 AM', '10:30 AM', '11:30 AM', '01:00 PM'].map(time => (
                  <tr key={time} style={{ borderBottom: '1px solid #E4E1D8' }}>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: '#A09080' }}>{time}</td>
                    {DAYS.map(day => {
                      const daySlots = mapSlots((weeklySchedule as any)[day] ?? [])
                      const entry    = daySlots.find(e => e.time === time)
                      if (!entry) return <td key={day} className="px-3 py-2" />
                      if (!isClassEntry(entry)) {
                        const e = entry as any
                        return (
                          <td key={day} className="px-3 py-2">
                            <div className="rounded-lg px-2 py-1.5 text-center text-xs"
                              style={{ background: e.type === 'break' ? '#FEF3C7' : '#F3F4F6', color: '#6B6660' }}>
                              {e.type === 'break' ? '☕' : '—'}
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td key={day} className="px-3 py-2">
                          <div className="rounded-lg p-2 text-xs"
                            style={{ background: day === activeDay ? 'rgba(201,160,32,0.08)' : 'white', border: `1px solid ${day === activeDay ? 'rgba(201,160,32,0.3)' : '#E4E1D8'}` }}>
                            <p className="font-semibold truncate">{entry.subject}</p>
                            <p className="truncate" style={{ color: '#6B6660' }}>{entry.group}</p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
