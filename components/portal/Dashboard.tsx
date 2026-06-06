'use client'
// Dashboard component for the portal - uses real student data from API

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'
import { Avatar, Card, CardLabel, GoldBadge, StatCard } from './portalUi'
import { RoleType } from './portalTypes'

const GOLD  = '#C9A020'
const RED   = '#EF4444'
const GREEN = '#10B981'
const BLUE  = '#3B82F6'
const BORDER = '#E8E4DC'

export function Dashboard({ role, studentId }: { role: RoleType; studentId?: string }) {
  const [showTeacherContact, setShowTeacherContact] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-dashboard', studentId],
    queryFn:  () => portalApi.getDashboard(studentId).then(r => r.data),
    enabled:  true,
  })

  const student   = data?.student   ?? {}
  const stats     = data?.stats     ?? {}
  const timetable = data?.timetable ?? []
  const caScores  = data?.ca_scores ?? []
  const term      = data?.term      ?? '—'
  const session   = data?.session   ?? '—'

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <p style={{ color: '#9B9590' }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="portal-dashboard-top-grid" style={{ display: 'grid', gap: 16, alignItems: 'start', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
            {term} · {session}
          </p>
          <h2 style={{ margin: '4px 0 10px', fontSize: 26, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>
            {role === 'parent' ? `Viewing: ${student.name}` : `Welcome, ${student.first_name ?? student.name}`}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {student.class_section && <GoldBadge>{student.class_section}</GoldBadge>}
            {student.level         && <GoldBadge>{student.level}</GoldBadge>}
            {student.form_teacher  && <GoldBadge color="#9B9590">Form Teacher: {student.form_teacher}</GoldBadge>}
            {student.house         && student.house !== '—' && <GoldBadge color={BLUE}>{student.house}</GoldBadge>}
          </div>
        </div>

        {/* Teacher contact card */}
        {student.form_teacher && student.form_teacher !== '—' && (
          <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 14, boxShadow: '0 10px 26px rgba(13,13,13,0.08)' }}>
            <button
              type="button"
              onClick={() => setShowTeacherContact(v => !v)}
              style={{ width: '100%', background: '#0D0D0D', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: GOLD, color: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: "'Georgia',serif" }}>
                {student.form_teacher.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>Class Teacher Contact</p>
                <p style={{ margin: '3px 0 0', color: '#FFFFFF', fontSize: 16, fontWeight: 800 }}>{student.form_teacher}</p>
                <p style={{ margin: 0, color: '#D7D2CB', fontSize: 11 }}>{student.class_section} Form Teacher</p>
              </div>
              <span style={{ color: GOLD, fontSize: 18, fontWeight: 900, transform: showTeacherContact ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>⌄</span>
            </button>
            {showTeacherContact && (
              <div style={{ padding: 16, background: '#FFFFFF' }}>
                <p style={{ margin: 0, color: '#5C5750', fontSize: 12 }}>Contact through the school office for consultation times.</p>
              </div>
            )}
          </Card>
        )}
      </div>

      <style jsx>{`
        .portal-dashboard-top-grid { grid-template-columns: minmax(0,1fr) minmax(280px,340px); }
        @media (max-width: 900px) { .portal-dashboard-top-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Fees Balance"   value={`₦${((stats.fees_balance ?? 0) / 1000).toFixed(0)}k`} sub="This term outstanding"           color={RED}   />
        <StatCard label="Avg CA Score"   value={stats.avg_ca_score ?? '—'}                             sub={`${term} CAs`}                    color={GOLD}  />
        <StatCard label="Attendance"     value={`${stats.attendance_pct ?? 0}%`}                       sub="This term"                        color={GREEN} />
        <StatCard label="Class Position" value={stats.position ? `${stats.position}th` : '—'}          sub={`of ${stats.class_size ?? '—'} students`} color={BLUE}  />
      </div>

      {/* Timetable + CA scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Today's Timetable</CardLabel>
          {timetable.length === 0 ? (
            <p style={{ color: '#9B9590', fontSize: 13 }}>No classes scheduled today.</p>
          ) : (
            timetable.slice(0, 4).map((item: any, index: number) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: index < 3 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#C9A02020', border: '1px solid #C9A02033', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 8, color: '#C9A020', fontFamily: 'monospace', lineHeight: 1 }}>{item.day}</span>
                  <span style={{ fontSize: 10, color: '#0D0D0D', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.4 }}>{item.time}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9B9590' }}>{item.teacher} · {item.room}</p>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card>
          <CardLabel>{term} CA Scores</CardLabel>
          {caScores.length === 0 ? (
            <p style={{ color: '#9B9590', fontSize: 13 }}>No CA scores recorded yet.</p>
          ) : (
            caScores.map((subject: any, index: number) => {
              const total  = subject.ca1 + subject.ca2
              const maxCA  = subject.max_marks ?? 40
              const pct    = maxCA > 0 ? Math.round((total / maxCA) * 100) : 0
              const color  = pct >= 75 ? GOLD : pct >= 50 ? '#F59E0B' : RED
              return (
                <div key={index} style={{ padding: '7px 0', borderBottom: index < caScores.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name}</p>
                    <span style={{ fontSize: 12, color, fontWeight: 700, marginLeft: 8, fontFamily: 'monospace' }}>{total}/{maxCA}</span>
                  </div>
                  <div style={{ height: 4, background: BORDER, borderRadius: 2 }}>
                    <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })
          )}
        </Card>
      </div>
    </div>
  )
}
