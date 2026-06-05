'use client'
import { useQuery } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import { Clock, Users, ClipboardCheck, AlertCircle, MapPin, CheckCircle2, Calendar } from 'lucide-react'
import { StatCard } from '../_components'
import { MOCK_TODAY_SCHEDULE, MOCK_PENDING_ATTENDANCE, MOCK_UPCOMING_ASSESSMENTS } from '../_mock-data'
import type { Section } from '../_types'
import { getNoticesForRole, type NoticeItem } from '@/lib/utils'

type DashboardScheduleSlot = {
  id: string
  time: string
  subject: string
  group: string
  room: string
  status?: string
}

type PendingAttendanceItem = {
  id: string
  group: string
  subject: string
  students: number
}

type UpcomingAssessmentItem = {
  id: string
  type: string
  maxMarks: number
  title: string
  group: string
  date: string
}

const scheduleStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: '#ECFDF5', text: '#065F46', label: 'Completed' },
  live: { bg: '#FEF3C7', text: '#92400E', label: 'In Progress' },
  upcoming: { bg: '#F3F4F6', text: '#4B5563', label: 'Upcoming' },
}

const assessTypeStyle: Record<string, string> = {
  Exam: 'badge-red', Assignment: 'badge-blue', Quiz: 'badge-gold',
}

interface Props {
  onNavigate: (s: Section) => void
}

export default function DashboardSection({ onNavigate }: Props) {

  const { data } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => teacherApi.getDashboard().then(r => r.data),
  })

  const stats = data?.stats ?? { totalClasses: 0, totalStudents: 0, attendanceRate: 0, pendingGrading: 0 }
  const todaySchedule: DashboardScheduleSlot[] = data?.today_schedule ?? []
  const pendingAttendance: PendingAttendanceItem[] = data?.pending_attendance ?? []
  const upcomingAssessments: UpcomingAssessmentItem[] = data?.upcoming_assessments ?? []

  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [showAllNoticesModal, setShowAllNoticesModal] = useState(false)
  const [showNoticeViewModal, setShowNoticeViewModal] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)

  const selectedNotice = useMemo(() => {
    if (!selectedNoticeId) return null
    return notices.find((n) => n.id === selectedNoticeId) ?? null
  }, [notices, selectedNoticeId])

  useEffect(() => {
    setNotices(getNoticesForRole('staff', []))
  }, [])

  const openNoticeView = (id: string) => {
    setSelectedNoticeId(id)
    setShowNoticeViewModal(true)
  }

  return (
    <>
      <div>
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Instructor Dashboard</h1>
        <p className="page-subtitle">Welcome back, {stats.teacher_name}. Here&apos;s your day at a glance.</p>
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in stagger-1">
          <StatCard icon={<Clock size={18} style={{ color: '#C9A020' }} />} iconBg="rgba(201,160,32,0.12)" value={stats.totalClasses} label="Classes Today" />
          <StatCard icon={<Users size={18} style={{ color: '#10B981' }} />} iconBg="rgba(16,185,129,0.12)" value={stats.totalStudents} label="Total Students" />
          <StatCard icon={<ClipboardCheck size={18} style={{ color: '#3B82F6' }} />} iconBg="rgba(59,130,246,0.12)" value={`${stats.attendanceRate}%`} label="Attendance Rate" />
          <StatCard icon={<AlertCircle size={18} style={{ color: '#EF4444' }} />} iconBg="rgba(239,68,68,0.12)" value={stats.pendingGrading} label="Pending Grading" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="xl:col-span-2 card animate-in stagger-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Today&apos;s Schedule</h2>
              <button onClick={() => onNavigate('schedule')} className="text-xs font-medium" style={{ color: '#C9A020' }}>View Full Schedule →</button>
            </div>
            <div className="space-y-3">
              {todaySchedule.map(slot => {
                const style = scheduleStatusStyle[slot.status || 'upcoming']
                return (
                  <div key={slot.id} className="flex items-center gap-4 p-3 rounded-xl transition-all"
                    style={{ background: slot.status === 'live' ? 'rgba(201,160,32,0.05)' : 'white', border: `1px solid ${slot.status === 'live' ? 'rgba(201,160,32,0.3)' : '#E4E1D8'}` }}>
                    <div className="text-sm font-mono w-20 flex-shrink-0" style={{ color: '#6B6660' }}>{slot.time}</div>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: slot.status === 'completed' ? '#10B981' : slot.status === 'live' ? '#C9A020' : '#D1D5DB', boxShadow: slot.status === 'live' ? '0 0 0 3px rgba(201,160,32,0.2)' : 'none' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{slot.subject}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><Users size={11} /> {slot.group}</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><MapPin size={11} /> {slot.room}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: style.bg, color: style.text }}>{style.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pending Attendance */}
            <div className="card animate-in stagger-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">Pending Attendance</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#991B1B' }}>{MOCK_PENDING_ATTENDANCE.length}</span>
              </div>
              {pendingAttendance.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={32} style={{ color: '#10B981' }} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: '#6B6660' }}>All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAttendance.map(item => (
                    <div key={item.id} className="p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{item.group}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#6B6660' }}>{item.subject} · {item.students} students</p>
                        </div>
                        <button onClick={() => onNavigate('attendance')} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#C9A020', color: 'white' }}>Mark</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Assessments */}
            <div className="card animate-in stagger-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">Upcoming Assessments</h3>
                <button onClick={() => onNavigate('assessment-input')} className="text-xs font-medium" style={{ color: '#C9A020' }}>View All</button>
              </div>
              <div className="space-y-3">
                {upcomingAssessments.map(item => (
                  <div key={item.id} className="p-3 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`badge ${assessTypeStyle[item.type] || 'badge-gray'}`}>{item.type}</span>
                      <span className="text-xs" style={{ color: '#6B6660' }}>{item.maxMarks} marks</span>
                    </div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><Users size={11} /> {item.group}</span>
                      <span className="text-xs flex items-center gap-1" style={{ color: '#6B6660' }}><Calendar size={11} /> {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Notices */}
            <div className="card animate-in stagger-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} style={{ color: '#C9A020' }} />
                  <h3 className="font-bold text-base">School Notices</h3>
                </div>
                {notices.length > 5 ? (
                  <button type="button" className="text-xs font-medium" style={{ color: '#C9A020' }} onClick={() => setShowAllNoticesModal(true)}>
                    View All
                  </button>
                ) : null}
              </div>

              {notices.length === 0 ? (
                <div className="text-sm" style={{ color: '#6B6660' }}>No notices yet.</div>
              ) : (
                <div className="space-y-3">
                  {notices.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="p-3 rounded-lg w-full text-left transition-all"
                      style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}
                      onClick={() => openNoticeView(n.id)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold text-sm" style={{ color: '#0D0D0D' }}>{n.title}</p>
                        <span className="text-xs flex-shrink-0" style={{ color: '#A09080' }}>{n.date}</span>
                      </div>
                      <p className="text-xs font-semibold tracking-wider mt-1" style={{ color: '#C9A020' }}>{n.audience}</p>
                      <p className="text-sm mt-1" style={{ color: '#6B6660' }}>{n.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {showAllNoticesModal ? (
        <div className="fixed inset-0" style={{ zIndex: 70, background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-4xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">All Notices</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>Click any notice to view the full message.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowAllNoticesModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {notices.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="rounded-xl p-4 w-full text-left"
                    style={{
                      background: n.highlight ? 'rgba(201,160,32,0.06)' : '#F7F6F3',
                      border: `1px solid ${n.highlight ? 'rgba(201,160,32,0.25)' : '#E4E1D8'}`,
                      borderLeft: n.highlight ? '4px solid #C9A020' : '1px solid #E4E1D8',
                    }}
                    onClick={() => openNoticeView(n.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm">{n.title}</h3>
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#A09080' }}>{n.date}</span>
                    </div>
                    <p className="text-xs font-semibold tracking-wider mb-1.5" style={{ color: '#C9A020' }}>{n.audience}</p>
                    <p className="text-sm" style={{ color: '#6B6660' }}>{n.body}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowAllNoticesModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showNoticeViewModal && selectedNotice ? (
        <div className="fixed inset-0" style={{ zIndex: 70, background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-3xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div style={{ minWidth: 0 }}>
                  <h3 className="font-bold" style={{ wordBreak: 'break-word' }}>{selectedNotice.title}</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>
                    <span className="font-semibold" style={{ color: '#C9A020' }}>{selectedNotice.audience}</span>
                    <span style={{ margin: '0 8px', color: '#A09080' }}>•</span>
                    <span style={{ color: '#A09080' }}>{selectedNotice.date}</span>
                  </div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowNoticeViewModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="text-sm" style={{ color: '#6B6660', whiteSpace: 'pre-wrap' }}>
                {selectedNotice.body}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowNoticeViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
