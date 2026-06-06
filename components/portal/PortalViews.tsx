'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AlertCircle, Award, Bell, BookMarked, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock, Download, Megaphone, Printer, Target, TrendingUp, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/lib/api'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertCircle, Award, Bell, BookMarked, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock, Download, Printer, Target, TrendingUp, UserRound } from 'lucide-react'
import type { FeeItem } from '@/components/payment/PayStackModal'
import { escapeHtml } from '@/lib/security'
import { mockData, getGrade, GOLD, BORDER, BLUE, GREEN, RED } from './portalData'
import { Avatar, Card, CardLabel, GoldBadge, StatCard } from './portalUi'
import { RoleType } from './portalTypes'
import { getNoticesForRole, type NoticeItem } from '@/lib/utils'

const PayStackModal = dynamic(() => import('@/components/payment/PayStackModal'), { ssr: false })

type PortalDashboardData = {
  student: Record<string, unknown>
  stats: { attendance_pct: number; avg_score: number; outstanding_fees: number; upcoming_tests: number }
  upcoming_assessments: unknown[]
  fees: { structure: Array<{ amount: number }> }
  recent_activity: unknown[]
}

const emptyPortalDashboard: PortalDashboardData = {
  student: {},
  stats: { attendance_pct: 0, avg_score: 0, outstanding_fees: 0, upcoming_tests: 0 },
  upcoming_assessments: [],
  fees: { structure: [] },
  recent_activity: [],
}

function AttendanceBarChart({ compact = false }: { compact?: boolean }) {
  const records = mockData.student.attendance
  const data = records.map((item) => ({
    week: item.week.replace('Week ', 'W'),
    rate: item.schoolDays > 0 ? Math.round((item.daysPresent / item.schoolDays) * 100) : 0,
  }))
  const totalPresent = records.reduce((sum, item) => sum + item.daysPresent, 0)
  const totalSchoolDays = records.reduce((sum, item) => sum + item.schoolDays, 0)
  const average = totalSchoolDays > 0 ? Math.round((totalPresent / totalSchoolDays) * 100) : 0

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${GREEN}`,
        borderRadius: 12,
        padding: compact ? '12px 14px' : '14px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        minHeight: compact ? 138 : 156,
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}>Attendance</p>
        <span style={{ color: average >= 75 ? GREEN : RED, fontSize: 18, fontFamily: "'Georgia',serif", fontWeight: 800 }}>{average}%</span>
      </div>
      <div style={{ width: '100%', height: compact ? 70 : 84 }}>
        <ResponsiveContainer width="100%" height={compact ? 70 : 84}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -34 }}>
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9B9590' }} />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              cursor={{ fill: '#F6F1E6' }}
              formatter={(value) => [`${value}%`, 'Attendance']}
              labelStyle={{ color: '#0D0D0D', fontWeight: 700 }}
              contentStyle={{ border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 8px 18px rgba(13,13,13,0.10)' }}
            />
            <Bar dataKey="rate" fill={GREEN} radius={[5, 5, 2, 2]} barSize={compact ? 14 : 18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ margin: 0, color: '#5C5750', fontSize: 12 }}>Weekly attendance trend</p>
    </div>
  )
}

function printElementById(elementId: string, title: string) {
  if (typeof window === 'undefined') return

  const element = document.getElementById(elementId)
  if (!element) return

  const printWindow = window.open('', '_blank', 'width=900,height=1100,noopener,noreferrer')
  if (!printWindow) {
    const style = document.createElement('style')
    style.setAttribute('data-report-print-style', 'true')
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #${elementId}, #${elementId} * { visibility: visible !important; }
        #${elementId} {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        #${elementId} button { display: none !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    window.setTimeout(() => style.remove(), 500)
    return
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background: #ffffff;
            color: #0D0D0D;
            font-family: "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          button { display: none !important; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>${element.outerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

async function inlineImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    const src = image.getAttribute('src')
    if (!src || src.startsWith('data:')) return

    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      image.setAttribute('src', dataUrl)
    } catch {
      image.remove()
    }
  }))
}

function imageDataToPdf(imageDataUrl: string, width: number, height: number) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 28
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2
  const scale = Math.min(maxWidth / width, maxHeight / height)
  const imageWidth = width * scale
  const imageHeight = height * scale
  const x = (pageWidth - imageWidth) / 2
  const y = (pageHeight - imageHeight) / 2
  const imageBinary = atob(imageDataUrl.split(',')[1] || '')
  const parts: string[] = []
  const offsets: number[] = []
  const add = (value: string) => {
    offsets.push(parts.join('').length)
    parts.push(value)
  }

  parts.push('%PDF-1.4\n')
  add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBinary.length} >>\nstream\n${imageBinary}\nendstream\nendobj\n`)

  const content = `q\n${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im1 Do\nQ\n`
  add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

  const xrefOffset = parts.join('').length
  parts.push(`xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`)
  parts.push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  const pdf = parts.join('')
  const bytes = new Uint8Array(pdf.length)
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index)
  }
  return new Blob([bytes], { type: 'application/pdf' })
}

async function downloadReceiptDesign(element: HTMLElement | null, receipt: { id?: string; ref: string }) {
  if (!element || typeof window === 'undefined') return

  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-receipt-export-hidden="true"]').forEach((node) => node.remove())
  clone.style.width = `${element.offsetWidth}px`
  clone.style.maxHeight = 'none'
  clone.style.overflow = 'visible'
  clone.style.borderRadius = '14px'
  await inlineImages(clone)

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-10000px'
  wrapper.style.top = '0'
  wrapper.style.background = '#FFFFFF'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    const rect = clone.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 2, 3)
    const serialized = new XMLSerializer().serializeToString(clone)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
        </foreignObject>
      </svg>
    `
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(rect.width * scale)
    canvas.height = Math.ceil(rect.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pdf = imageDataToPdf(canvas.toDataURL('image/jpeg', 0.95), canvas.width, canvas.height)
    const url = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${(receipt.id || receipt.ref).replace(/[^a-z0-9-]/gi, '-')}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 500)
  } finally {
    wrapper.remove()
  }
}

export function Dashboard({ role }: { role: RoleType }) {
  const d = mockData.student
  const { data: dashboardData } = useQuery<PortalDashboardData>({
    queryKey: ['portal-dashboard'],
    queryFn: () => portalApi.getDashboard().then(r => r.data),
    placeholderData: emptyPortalDashboard,
  })
  const [showTeacherContact, setShowTeacherContact] = useState(false)
  const [schoolNotices, setSchoolNotices] = useState<NoticeItem[]>([])
  const [showAllNoticesModal, setShowAllNoticesModal] = useState(false)
  const [showNoticeViewModal, setShowNoticeViewModal] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)

  const selectedNotice = useMemo(() => {
    if (!selectedNoticeId) return null
    return schoolNotices.find((n) => n.id === selectedNoticeId) ?? null
  }, [schoolNotices, selectedNoticeId])

  useEffect(() => {
    setSchoolNotices(getNoticesForRole(role === 'parent' ? 'parent' : 'student', []))
  }, [role])

  const openNoticeView = (id: string) => {
    setSelectedNoticeId(id)
    setShowNoticeViewModal(true)
  }

  const totalFeesDue = d.fees.structure.reduce((sum, fee) => sum + fee.amount, 0)
  const avgAtt = Math.round(
    d.attendance.reduce((sum, item) => sum + (item.present / item.total) * 100, 0) / d.attendance.length,
  )
  const dashboard = dashboardData ?? emptyPortalDashboard
  const totalFeesDue = dashboard.fees.structure.reduce((sum, fee) => sum + fee.amount, 0)

  return (
    <div>
      <div className='portal-dashboard-top-grid' style={{ display: 'grid', gap: 16, alignItems: 'start', marginBottom: 24 }}>
        <div>
        <p style={{ margin: 0, fontSize: 11, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {mockData.term} · {mockData.session}
        </p>
        <h2 style={{ margin: '4px 0 10px', fontSize: 26, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>
          {role === 'parent' ? `Viewing: ${d.name}` : `Welcome, ${d.name.split(' ')[0]}`}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <GoldBadge>{d.class}</GoldBadge>
          <GoldBadge>{d.level}</GoldBadge>
          <GoldBadge color='#9B9590'>Form Teacher: {d.formTeacher}</GoldBadge>
          <GoldBadge color={BLUE}>{d.house}</GoldBadge>
        </div>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 14, boxShadow: '0 10px 26px rgba(13,13,13,0.08)' }}>
          <button
            type='button'
            onClick={() => setShowTeacherContact((value) => !value)}
            style={{ width: '100%', background: '#0D0D0D', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: GOLD, color: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: "'Georgia',serif" }}>MA</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>Class Teacher Contact</p>
              <p style={{ margin: '3px 0 0', color: '#FFFFFF', fontSize: 16, fontWeight: 800 }}>Mrs. Adeyemi</p>
              <p style={{ margin: 0, color: '#D7D2CB', fontSize: 11 }}>SS2A Form Teacher</p>
            </div>
            <span style={{ color: GOLD, fontSize: 18, fontWeight: 900, transform: showTeacherContact ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>⌄</span>
          </button>
          {showTeacherContact && (
            <div style={{ padding: 16, display: 'grid', gap: 9, background: '#FFFFFF' }}>
              {[
                ['Email', 'adeyemi.t@edumanage.sch'],
                ['Phone', '+234 802 345 6789'],
                ['Office', 'Staff Wing, Room 204'],
                ['Consultation', 'Wed 2pm - 4pm'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '86px 1fr', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ color: '#9B9590', fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ color: '#0D0D0D', fontSize: 12, fontWeight: 650, lineHeight: 1.35, minWidth: 0 }}>{value}</span>
                </div>
              ))}
              <div style={{ marginTop: 3, borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#5C5750', fontSize: 11 }}>Available for academic guidance</span>
                <span style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}33`, borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 900 }}>Active</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <style jsx>{`
        .portal-dashboard-top-grid {
          grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
        }

        @media (max-width: 900px) {
          .portal-dashboard-top-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label='Fees Balance' value={`₦${(totalFeesDue / 1000).toFixed(0)}k`} sub='This term outstanding' color={RED} />
        <StatCard label='Avg CA Score' value='72%' sub='2nd Term CAs' color={GOLD} />
        <AttendanceBarChart />
        <StatCard label='Class Position' value={`${d.reportCard.position}th`} sub={`of ${d.reportCard.classSize} students`} color={BLUE} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardLabel>Today's Timetable</CardLabel>
          {d.timetable.slice(0, 4).map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: index < 3 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#C9A02020', border: `1px solid #C9A02033`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: '#C9A020', fontFamily: 'monospace', lineHeight: 1 }}>{item.day}</span>
                <span style={{ fontSize: 10, color: '#0D0D0D', fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.4 }}>{item.time.split(' ')[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590' }}>{item.teacher} · {item.room}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <CardLabel>2nd Term CA Scores</CardLabel>
          {d.subjects.slice(0, 5).map((subject, index) => {
            const total = subject.ca1 + subject.ca2
            const pct = Math.round((total / 40) * 100)
            const grade = getGrade(pct)
            return (
              <div key={index} style={{ padding: '7px 0', borderBottom: index < 4 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name}</p>
                  <span style={{ fontSize: 12, color: grade.color, fontWeight: 700, marginLeft: 8, fontFamily: 'monospace' }}>{total}/40 <span style={{ fontSize: 10 }}>{grade.grade}</span></span>
                </div>
                <div style={{ height: 4, background: BORDER, borderRadius: 2 }}>
                  <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: grade.color }} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${GOLD}16`, border: `1px solid ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={16} color={GOLD} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}>
                  School Notices
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5C5750' }}>Official updates from the school.</p>
              </div>
            </div>

            {schoolNotices.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAllNoticesModal(true)}
                style={{ border: 'none', background: 'transparent', color: GOLD, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
              >
                View all
              </button>
            ) : null}
          </div>

          {schoolNotices.length === 0 ? (
            <p style={{ margin: 0, color: '#5C5750', fontSize: 13 }}>No notices yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {schoolNotices.slice(0, 5).map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => openNoticeView(notice.id)}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderLeft: notice.highlight ? `4px solid ${GOLD}` : `1px solid ${BORDER}`,
                    background: notice.highlight ? `${GOLD}10` : '#FFFFFF',
                    borderRadius: 12,
                    padding: '12px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notice.title}</p>
                      <p style={{ margin: '4px 0 0', color: GOLD, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>{notice.audience}</p>
                    </div>
                    <span style={{ color: '#9B9590', fontSize: 11, whiteSpace: 'nowrap' }}>{notice.date}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.5 }}>{notice.body}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showAllNoticesModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: 'min(980px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#FFFFFF', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 18px 44px rgba(13,13,13,0.18)' }}>
            <div style={{ padding: '16px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>School Notices</p>
                <h3 style={{ margin: '6px 0 0', color: '#0D0D0D', fontSize: 18, fontWeight: 900 }}>All Notices</h3>
              </div>
              <button type="button" onClick={() => setShowAllNoticesModal(false)} style={{ border: `1px solid ${BORDER}`, background: '#FFFFFF', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                <X size={16} color="#0D0D0D" />
              </button>
            </div>

            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              {schoolNotices.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => openNoticeView(notice.id)}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderLeft: notice.highlight ? `4px solid ${GOLD}` : `1px solid ${BORDER}`,
                    background: notice.highlight ? `${GOLD}10` : '#FFFFFF',
                    borderRadius: 12,
                    padding: '12px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 800 }}>{notice.title}</p>
                      <p style={{ margin: '4px 0 0', color: GOLD, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>{notice.audience}</p>
                    </div>
                    <span style={{ color: '#9B9590', fontSize: 11, whiteSpace: 'nowrap' }}>{notice.date}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.5 }}>{notice.body}</p>
                </button>
              ))}
            </div>

            <div style={{ padding: 16, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAllNoticesModal(false)} style={{ border: `1px solid ${BORDER}`, background: '#FFFFFF', borderRadius: 999, padding: '10px 14px', cursor: 'pointer', fontWeight: 800, color: '#0D0D0D' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showNoticeViewModal && selectedNotice ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.55)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: 'min(860px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#FFFFFF', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 18px 44px rgba(13,13,13,0.18)' }}>
            <div style={{ padding: '16px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>{selectedNotice.audience}</p>
                <h3 style={{ margin: '6px 0 0', color: '#0D0D0D', fontSize: 20, fontWeight: 900, wordBreak: 'break-word' }}>{selectedNotice.title}</h3>
                <p style={{ margin: '6px 0 0', color: '#9B9590', fontSize: 11 }}>{selectedNotice.date}</p>
              </div>
              <button type="button" onClick={() => setShowNoticeViewModal(false)} style={{ border: `1px solid ${BORDER}`, background: '#FFFFFF', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                <X size={16} color="#0D0D0D" />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ margin: 0, color: '#5C5750', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{selectedNotice.body}</p>
            </div>
            <div style={{ padding: 16, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowNoticeViewModal(false)} style={{ border: `1px solid ${BORDER}`, background: '#FFFFFF', borderRadius: 999, padding: '10px 14px', cursor: 'pointer', fontWeight: 800, color: '#0D0D0D' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Subjects() {
  const subjects = mockData.student.subjects
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Subjects & Scores</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} · {mockData.session} · {mockData.student.class}</p>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <CardLabel>Score Breakdown — All Subjects</CardLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}`, background: '#FAFAF8' }}>
                {['Subject', 'Teacher', 'CA1 /20', 'CA2 /20', 'Mid-Term /40', 'Exam /100', 'Total /100', 'Grade'].map((header) => (
                  <th key={header} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#9B9590', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => {
                const caTotal = subject.ca1 + subject.ca2
                const composite = Math.round(((caTotal / 40) + (subject.midterm / 40)) * 50)
                const grade = getGrade(composite)
                return (
                  <tr key={index} style={{ borderBottom: `1px solid ${BORDER}`, background: index % 2 === 0 ? '#FAFAF8' : '#FFFFFF' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0D0D0D' }}>{subject.name}</td>
                    <td style={{ padding: '10px 10px', color: '#9B9590', fontSize: 12 }}>{subject.teacher}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.ca1}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.ca2}</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', color: '#0D0D0D' }}>{subject.midterm}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', color: '#9B9590', fontSize: 12 }}>Pending</td>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, color: grade.color }}>{composite}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <span style={{ background: `${grade.color}18`, color: grade.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${grade.color}33` }}>{grade.grade}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardLabel>Nigerian Grading Scale (WAEC / NECO)</CardLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { range: '75–100', grade: 'A1', color: GOLD },
            { range: '70–74', grade: 'B2', color: GREEN },
            { range: '65–69', grade: 'B3', color: GREEN },
            { range: '60–64', grade: 'C4', color: BLUE },
            { range: '55–59', grade: 'C5', color: BLUE },
            { range: '50–54', grade: 'C6', color: BLUE },
            { range: '45–49', grade: 'D7', color: '#E8A020' },
            { range: '40–44', grade: 'E8', color: '#E8A020' },
            { range: '0–39', grade: 'F9', color: RED },
          ].map((item, index) => (
            <div key={index} style={{ background: `${item.color}12`, border: `1px solid ${item.color}33`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: item.color, fontFamily: 'monospace' }}>{item.grade}</p>
              <p style={{ margin: '1px 0 0', fontSize: 10, color: '#9B9590' }}>{item.range}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function Fees() {
  const fees = mockData.student.fees
  const feeItems: FeeItem[] = fees.structure.map((fee, index) => ({ id: index + 1, ...fee }))
  type PaymentHistoryItem = (typeof fees.history)[number] & { items?: Array<{ label: string; amount: number }> }
  const [selectedFeeIds, setSelectedFeeIds] = useState<number[]>(feeItems.map((fee) => fee.id))
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(fees.history)
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentHistoryItem | null>(null)
  const [currentTermPaid, setCurrentTermPaid] = useState(50000)
  const receiptRef = useRef<HTMLDivElement | null>(null)
  const totalDue = feeItems.reduce((sum, fee) => sum + fee.amount, 0)
  const totalPaid = paymentHistory.reduce((sum, fee) => sum + fee.amount, 0)
  const balance = Math.max(totalDue - currentTermPaid, 0)
  const selectedFees = feeItems.filter((fee) => selectedFeeIds.includes(fee.id))
  const selectedTotal = selectedFees.reduce((sum, fee) => sum + fee.amount, 0)

  const toggleFee = (id: number) => {
    setSelectedFeeIds((current) => (current.includes(id) ? current.filter((feeId) => feeId !== id) : [...current, id]))
  }

  const handlePaymentSuccess = ({ reference, amount, selectedFees }: { reference: string; amount: number; studentId: string; selectedFees: FeeItem[] }) => {
    setPaymentHistory((current) => [
      {
        id: reference,
        date: new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }),
        desc: `${mockData.term} Fees Payment`,
        amount,
        method: 'PayStack',
        ref: reference,
        items: selectedFees.map((fee) => ({ label: fee.label, amount: fee.amount })),
      },
      ...current,
    ])
    setCurrentTermPaid((current) => Math.min(current + amount, totalDue))
    setSelectedFeeIds([])
    setPaymentNotice(`Payment successful. Reference: ${reference}`)
  }

  const handlePaymentError = (error: string) => {
    setPaymentNotice(error)
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>School Fees</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} / {mockData.session} / {mockData.student.class}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label='Total Due' value={`NGN ${(totalDue / 1000).toFixed(0)}k`} sub='This term' color={RED} />
        <StatCard label='Amount Paid' value={`NGN ${(totalPaid / 1000).toFixed(0)}k`} sub='All payments' color={GREEN} />
        <StatCard label='Balance' value={`NGN ${(balance / 1000).toFixed(0)}k`} sub='Outstanding' color={GOLD} />
      </div>
      {balance > 0 && (
        <div style={{ background: `${RED}10`, border: `1px solid ${RED}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: RED, fontWeight: 600 }}>Outstanding balance of NGN {balance.toLocaleString()} - Please complete payment to avoid disruption to academic activities.</p>
        </div>
      )}
      {paymentNotice && (
        <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#5C5750', fontWeight: 600 }}>{paymentNotice}</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <CardLabel>Fee Structure - {mockData.term}</CardLabel>
            <button
              onClick={() => setIsPaymentOpen(true)}
              disabled={selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0}
              style={{
                background: selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0 ? '#E8E4DC' : GOLD,
                border: 'none',
                color: '#0D0D0D',
                fontSize: 12,
                padding: '8px 16px',
                borderRadius: 7,
                cursor: selectedFees.length === 0 || selectedTotal <= 0 || balance <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Pay Now
            </button>
          </div>
          {feeItems.map((fee, index) => (
            <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: index < feeItems.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 13, color: '#0D0D0D', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={selectedFeeIds.includes(fee.id)}
                  onChange={() => toggleFee(fee.id)}
                  disabled={balance <= 0}
                  style={{ accentColor: GOLD, width: 15, height: 15 }}
                />
                {fee.label}
              </label>
              <p style={{ margin: 0, fontSize: 13, color: '#0D0D0D', fontFamily: 'monospace', fontWeight: 600 }}>NGN {fee.amount.toLocaleString()}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: `2px solid ${GOLD}55`, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0D0D0D' }}>Selected Total</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#C9A020', fontFamily: 'monospace' }}>NGN {selectedTotal.toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div style={{ marginBottom: 14 }}>
            <CardLabel>Payment History</CardLabel>
          </div>
          {paymentHistory.map((item, index) => (
            <div key={index} style={{ padding: '10px 0', borderBottom: index < paymentHistory.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, color: '#0D0D0D', fontWeight: 500 }}>{item.desc}</p>
                  <p style={{ margin: '0 0 1px', fontSize: 11, color: '#9B9590' }}>{item.date} / {item.method}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#9B9590', fontFamily: 'monospace' }}>{item.ref}</p>
                  <button
                    type='button'
                    onClick={() => setSelectedReceipt(item)}
                    style={{ marginTop: 8, border: `1px solid ${GOLD}66`, color: GOLD, background: '#FFFFFF', fontSize: 11, padding: '6px 12px', borderRadius: 6, fontWeight: 900, cursor: 'pointer' }}
                  >
                    View
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: GREEN, fontFamily: 'monospace', fontWeight: 700 }}>NGN {item.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
      {selectedReceipt && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='Payment receipt'
          onClick={() => setSelectedReceipt(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.56)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
        >
          <div
            ref={receiptRef}
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(620px,100%)', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 24px 70px rgba(13,13,13,0.28)' }}
          >
            <div style={{ background: '#0D0D0D', color: '#FFFFFF', padding: 20, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                <div style={{ width: 58, height: 58, borderRadius: 12, background: '#FFFFFF', border: `1px solid ${GOLD}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img src='/FLEXI_LOGO.png' alt={`${mockData.schoolName} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 7 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: GOLD, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>Official Receipt</p>
                  <h3 style={{ margin: '5px 0 0', color: '#FFFFFF', fontSize: 23, fontFamily: "'Georgia',serif", fontWeight: 400, lineHeight: 1.15 }}>{mockData.schoolName}</h3>
                  <p style={{ margin: '5px 0 0', color: '#D7D2CB', fontSize: 12 }}>{mockData.term} · {mockData.session}</p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setSelectedReceipt(null)}
                aria-label='Close receipt'
                data-receipt-export-hidden='true'
                style={{ border: `1px solid ${GOLD}55`, background: 'transparent', color: GOLD, borderRadius: 8, width: 34, height: 34, fontSize: 18, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 22, display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 13, background: '#FAFAF8' }}>
                  <p style={{ margin: 0, color: '#9B9590', fontSize: 10, fontWeight: 900, letterSpacing: 0.9, textTransform: 'uppercase' }}>Student</p>
                  <p style={{ margin: '6px 0 0', color: '#0D0D0D', fontSize: 14, fontWeight: 850 }}>{mockData.student.name}</p>
                  <p style={{ margin: '3px 0 0', color: '#5C5750', fontSize: 12 }}>{mockData.student.id} · {mockData.student.class}</p>
                </div>
                <div style={{ border: `1px solid ${GREEN}33`, borderRadius: 10, padding: 13, background: `${GREEN}10` }}>
                  <p style={{ margin: 0, color: GREEN, fontSize: 10, fontWeight: 900, letterSpacing: 0.9, textTransform: 'uppercase' }}>Amount Paid</p>
                  <p style={{ margin: '6px 0 0', color: GREEN, fontSize: 24, fontFamily: "'Georgia',serif", fontWeight: 800 }}>NGN {selectedReceipt.amount.toLocaleString()}</p>
                </div>
              </div>

              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: '#FAFAF8', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: '#9B9590', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Payment Items</span>
                  <span style={{ color: '#9B9590', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Amount</span>
                </div>
                {(selectedReceipt.items && selectedReceipt.items.length > 0 ? selectedReceipt.items : [{ label: selectedReceipt.desc, amount: selectedReceipt.amount }]).map((item, index) => (
                  <div key={`${item.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 14px', borderTop: index === 0 ? 'none' : `1px solid ${BORDER}`, background: '#FFFFFF' }}>
                    <span style={{ color: '#0D0D0D', fontSize: 13, fontWeight: 750 }}>{item.label}</span>
                    <span style={{ color: '#0D0D0D', fontSize: 13, fontWeight: 850, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>NGN {item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 14px', background: `${GREEN}10`, borderTop: `1px solid ${GREEN}33` }}>
                  <span style={{ color: GREEN, fontSize: 13, fontWeight: 900 }}>Total Paid</span>
                  <span style={{ color: GREEN, fontSize: 14, fontWeight: 900, fontFamily: 'monospace' }}>NGN {selectedReceipt.amount.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                {[
                  ['Payment Date', selectedReceipt.date],
                  ['Payment Method', selectedReceipt.method],
                  ['Reference', selectedReceipt.ref],
                  ['Receipt ID', selectedReceipt.id || selectedReceipt.ref],
                  ['Status', 'Successful'],
                ].map(([label, value], index) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, padding: '12px 14px', borderTop: index === 0 ? 'none' : `1px solid ${BORDER}`, background: index % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                    <span style={{ color: '#9B9590', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ color: label === 'Status' ? GREEN : '#0D0D0D', fontSize: 13, fontWeight: label === 'Reference' || label === 'Receipt ID' ? 800 : 650, fontFamily: label === 'Reference' || label === 'Receipt ID' ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}33`, borderRadius: 10, padding: 13 }}>
                <p style={{ margin: 0, color: '#5C5750', fontSize: 12, lineHeight: 1.6 }}>
                  This receipt confirms that the payment above has been recorded for {mockData.student.name}. Please keep this reference for school fee reconciliation.
                </p>
              </div>

              <div data-receipt-export-hidden='true' style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type='button'
                  onClick={() => setSelectedReceipt(null)}
                  style={{ border: `1px solid ${BORDER}`, color: '#5C5750', background: '#FFFFFF', fontSize: 12, padding: '9px 14px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type='button'
                  onClick={() => downloadReceiptDesign(receiptRef.current, selectedReceipt)}
                  style={{ border: 'none', color: '#0D0D0D', background: GOLD, fontSize: 12, padding: '10px 15px', borderRadius: 8, fontWeight: 900, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PayStackModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        selectedFees={selectedFees}
        totalAmount={selectedTotal}
        studentName={mockData.student.name}
        studentEmail='parent.okafor@example.com'
        studentId={mockData.student.id}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  )
}
export function Attendance() {
  const att = mockData.student.attendance
  const [selectedWeekStart, setSelectedWeekStart] = useState(att[0]?.weekStart || '')
  const selectedWeek = att.find((item) => item.weekStart === selectedWeekStart) || att[0]
  const totalPresent = att.reduce((sum, item) => sum + item.daysPresent, 0)
  const totalSchoolDays = att.reduce((sum, item) => sum + item.schoolDays, 0)
  const totalAbsent = totalSchoolDays - totalPresent
  const presentWeeks = att.filter((item) => item.status === 'present').length
  const overall = totalSchoolDays > 0 ? Math.round((totalPresent / totalSchoolDays) * 100) : 0
  const chartData = att.map((item) => ({
    absent: Math.max(item.schoolDays - item.daysPresent, 0),
    present: item.daysPresent,
    rate: item.schoolDays > 0 ? Math.round((item.daysPresent / item.schoolDays) * 100) : 0,
    week: item.week.replace('Week ', 'W'),
  }))
  const formatWeekDate = (value: string) => new Date(value).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
  const statusColor = (status: string) => (status === 'present' ? GREEN : RED)

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Weekly Attendance Record</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} · {mockData.session} · {mockData.student.class}</p>
      </div>
      {overall < 75 && (
        <div style={{ background: `${RED}10`, border: `1px solid ${RED}44`, borderRadius: 10, padding: '12px 18px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: RED, fontWeight: 600 }}>Attendance below 75% minimum. Students below this threshold may be barred from sitting examinations.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label='Overall' value={`${overall}%`} sub='Weekly attendance rate' color={overall >= 75 ? GOLD : RED} />
        <StatCard label='Present' value={`${totalPresent}`} sub='Days attended' color={GREEN} />
        <StatCard label='Absent' value={`${totalAbsent}`} sub='Days missed' color={RED} />
        <StatCard label='Weeks Present' value={`${presentWeeks}/${att.length}`} sub='Recorded weeks' color={BLUE} />
      </div>
      <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 5, minWidth: 240 }}>
          <span style={{ color: '#5C5750', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>View Week</span>
          <select
            value={selectedWeekStart}
            onChange={(event) => setSelectedWeekStart(event.target.value)}
            style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 11px', color: '#0D0D0D', background: '#FFFFFF', outlineColor: GOLD }}
          >
            {att.map((item) => (
              <option key={item.weekStart} value={item.weekStart}>
                {item.week} - {formatWeekDate(item.weekStart)} to {formatWeekDate(item.weekEnd)}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'grid', gap: 2, textAlign: 'right' }}>
          <span style={{ color: '#9B9590', fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Selected Report</span>
          <span style={{ color: '#0D0D0D', fontSize: 13, fontWeight: 850 }}>{selectedWeek.week}</span>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardLabel>Weekly Attendance Bar Chart</CardLabel>
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5C5750' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9B9590' }} />
              <Tooltip
                cursor={{ fill: '#F6F1E6' }}
                formatter={(value, name) => [name === 'rate' ? `${value}%` : `${value} days`, name === 'present' ? 'Present' : name === 'absent' ? 'Absent' : 'Rate']}
                labelStyle={{ color: '#0D0D0D', fontWeight: 800 }}
                contentStyle={{ border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 8px 18px rgba(13,13,13,0.10)' }}
              />
              <Bar dataKey="present" fill={GREEN} radius={[5, 5, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill={RED} radius={[5, 5, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {selectedWeek ? (
        <Card>
          <CardLabel>{selectedWeek.week} Attendance Report</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
            <StatCard label='Week' value={selectedWeek.week} sub={`${formatWeekDate(selectedWeek.weekStart)} to ${formatWeekDate(selectedWeek.weekEnd)}`} color={GOLD} />
            <StatCard label='Status' value={selectedWeek.status === 'present' ? 'Present' : 'Absent'} sub='Weekly mark' color={statusColor(selectedWeek.status)} />
            <StatCard label='Days Present' value={`${selectedWeek.daysPresent}/${selectedWeek.schoolDays}`} sub='School days' color={GREEN} />
          </div>
          <div style={{ background: '#FAFAF8', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <p style={{ margin: 0, color: '#0D0D0D', fontSize: 13, fontWeight: 800 }}>Teacher Note</p>
            <p style={{ margin: '6px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.6 }}>{selectedWeek.note || 'No note was added for this week.'}</p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function StudentFocusedResultCard() {
  const d = mockData.student
  const rc = d.reportCard
  const resultRows = d.subjects.map((subject) => {
    const caTotal = subject.ca1 + subject.ca2
    const score = Math.round(((caTotal + subject.midterm) / 80) * 100)
    const grade = getGrade(score)
    return {
      ...subject,
      caTotal,
      score,
      grade,
      focus: score >= 75 ? 'Keep stretching' : score >= 60 ? 'Practice corrections' : 'Ask for support',
    }
  })
  const averageScore = Math.round(resultRows.reduce((sum, row) => sum + row.score, 0) / resultRows.length)
  const strongestSubject = resultRows.reduce((best, row) => (row.score > best.score ? row : best), resultRows[0])
  const focusSubject = resultRows.reduce((lowest, row) => (row.score < lowest.score ? row : lowest), resultRows[0])
  const overallGrade = getGrade(averageScore)
  const totalScore = resultRows.reduce((sum, row) => sum + row.score, 0)
  const maxScore = resultRows.length * 100

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>My Result</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.term} / {mockData.session} / {d.class}</p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#5C5750', lineHeight: 1.55 }}>A clear view of your scores, strengths, and the next subjects to focus on.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type='button'
            onClick={() => printElementById('student-result-card', `${d.name} Result`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#FFFFFF', border: `1px solid ${BORDER}`, color: '#0D0D0D', fontSize: 12, padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontWeight: 700 }}
          >
            <Download size={14} /> Save PDF
          </button>
          <button
            type='button'
            onClick={() => printElementById('student-result-card', `${d.name} Result`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#C9A020', border: 'none', color: '#0D0D0D', fontSize: 12, padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontWeight: 700 }}
          >
            <Printer size={14} /> Print
          </button>
        </div>

        <Card style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}33`, borderRadius: 16, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)' }}>
          <p style={{ margin: '0 0 8px', color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Class Teacher Contact</p>
          <p style={{ margin: 0, color: '#0D0D0D', fontSize: 16, fontWeight: 800 }}>Mrs. Adeyemi</p>
          <p style={{ margin: '4px 0 12px', color: '#5C5750', fontSize: 12 }}>SS2A Form Teacher</p>
          <div style={{ display: 'grid', gap: 7, color: '#5C5750', fontSize: 12, lineHeight: 1.45 }}>
            <span><strong style={{ color: '#0D0D0D' }}>Email:</strong> adeyemi.t@edumanage.sch</span>
            <span><strong style={{ color: '#0D0D0D' }}>Phone:</strong> +234 802 345 6789</span>
            <span><strong style={{ color: '#0D0D0D' }}>Office:</strong> Staff Wing, Room 204</span>
            <span><strong style={{ color: '#0D0D0D' }}>Consultation:</strong> Wed 2pm - 4pm</span>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .portal-dashboard-top-grid {
          grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
        }

        @media (max-width: 900px) {
          .portal-dashboard-top-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div id='student-result-card'>
      <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#0D0D0D', padding: 22, color: '#FFFFFF', display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <Avatar initials={d.avatar} size={62} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#C9A020', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}>Student Result Card</p>
              <h3 style={{ margin: '6px 0 8px', fontSize: 25, color: '#FFFFFF', fontFamily: "'Georgia',serif", fontWeight: 400, lineHeight: 1.15 }}>{d.name}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <GoldBadge>{d.class}</GoldBadge>
                <GoldBadge color='#D7D2CB'>{d.id}</GoldBadge>
                <GoldBadge color={BLUE}>{mockData.schoolName}</GoldBadge>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(92px,1fr))', gap: 10, minWidth: 210 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
              <p style={{ margin: 0, color: '#C9A020', fontSize: 24, fontWeight: 800, fontFamily: "'Georgia',serif" }}>{averageScore}%</p>
              <p style={{ margin: '2px 0 0', color: '#D7D2CB', fontSize: 11 }}>Average score</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
              <p style={{ margin: 0, color: overallGrade.color, fontSize: 24, fontWeight: 800, fontFamily: "'Georgia',serif" }}>{overallGrade.grade}</p>
              <p style={{ margin: '2px 0 0', color: '#D7D2CB', fontSize: 11 }}>{overallGrade.label}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
            <StatCard label='Total Score' value={`${totalScore}/${maxScore}`} sub='Across all subjects' color={GOLD} />
            <StatCard label='Class Position' value={`${rc.position}th`} sub={`Improved from ${rc.prevPosition}th`} color={BLUE} />
            <StatCard label='Strongest' value={strongestSubject.grade.grade} sub={strongestSubject.name} color={GREEN} />
            <StatCard label='Next Focus' value={focusSubject.grade.grade} sub={focusSubject.name} color={RED} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, alignItems: 'start', marginBottom: 18 }}>
            <div>
              <CardLabel>Subject Results</CardLabel>
              <div style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${BORDER}`, background: '#FAFAF8' }}>
                      {['Subject', 'Teacher', 'CA /40', 'Mid-Term /40', 'Result /100', 'Grade', 'Student Focus'].map((header) => (
                        <th key={header} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 10, color: '#9B9590', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows.map((subject, index) => (
                      <tr key={subject.name} style={{ borderBottom: index < resultRows.length - 1 ? `1px solid ${BORDER}` : 'none', background: index % 2 === 0 ? '#FAFAF8' : '#FFFFFF' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: '#0D0D0D' }}>{subject.name}</td>
                        <td style={{ padding: '10px', color: '#5C5750', fontSize: 12 }}>{subject.teacher}</td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', textAlign: 'center' }}>{subject.caTotal}</td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', textAlign: 'center' }}>{subject.midterm}</td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 800, color: subject.grade.color }}>{subject.score}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ background: `${subject.grade.color}18`, color: subject.grade.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${subject.grade.color}33` }}>{subject.grade.grade}</span>
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, color: subject.grade.color, fontWeight: 700 }}>{subject.focus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ border: `1px solid ${GREEN}33`, background: `${GREEN}10`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <Award size={17} color={GREEN} />
                  <p style={{ margin: 0, fontSize: 12, color: GREEN, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Celebrate this</p>
                </div>
                <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 700 }}>{strongestSubject.name}</p>
                <p style={{ margin: '5px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.55 }}>Your strongest score is {strongestSubject.score}%. Keep using the study habits that worked here.</p>
              </div>
              <div style={{ border: `1px solid ${RED}33`, background: `${RED}10`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <Target size={17} color={RED} />
                  <p style={{ margin: 0, fontSize: 12, color: RED, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Focus next</p>
                </div>
                <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 700 }}>{focusSubject.name}</p>
                <p style={{ margin: '5px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.55 }}>Review corrections with {focusSubject.teacher} and set one practice session before the next assessment.</p>
              </div>
              <div style={{ border: `1px solid ${BLUE}33`, background: `${BLUE}10`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <TrendingUp size={17} color={BLUE} />
                  <p style={{ margin: 0, fontSize: 12, color: BLUE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Momentum</p>
                </div>
                <p style={{ margin: 0, color: '#5C5750', fontSize: 13, lineHeight: 1.55 }}>You moved from {rc.prevPosition}th to {rc.position}th in a class of {rc.classSize}. Aim for one more place next term.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <CardLabel>Form Teacher's Remark</CardLabel>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#0D0D0D', lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{rc.formTeacherRemark}&quot;</p>
          <p style={{ margin: 0, fontSize: 12, color: GOLD, fontWeight: 600 }}>{d.formTeacher}</p>
        </Card>
        <Card>
          <CardLabel>Principal's Remark</CardLabel>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#0D0D0D', lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{rc.principalRemark}&quot;</p>
          <p style={{ margin: 0, fontSize: 12, color: GOLD, fontWeight: 600 }}>Mr. Babatunde Afolabi, Principal</p>
        </Card>
      </div>
    </div>
  )
}

export { ReportCard } from '@/app/report-card/page'

export function ParentNotifications({
  selectedNotificationId,
  baseHref = '/notifications',
}: {
  selectedNotificationId?: string | null
  baseHref?: string
} = {}) {
  const notifications = mockData.parentNotifications
  const selectedNotification = notifications.find((item) => item.id === selectedNotificationId) || null
  const [schoolNotices, setSchoolNotices] = useState<NoticeItem[]>([])
  const [showAllNoticesModal, setShowAllNoticesModal] = useState(false)
  const [showNoticeViewModal, setShowNoticeViewModal] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)

  const selectedNotice = useMemo(() => {
    if (!selectedNoticeId) return null
    return schoolNotices.find((n) => n.id === selectedNoticeId) ?? null
  }, [schoolNotices, selectedNoticeId])

  const notificationAliases: Record<string, string> = {
    '1': 'fee-balance-reminder',
    '2': 'result-published',
    '3': 'attendance-alert',
  }
  const activeNotificationId = selectedNotificationId ? notificationAliases[selectedNotificationId] ?? selectedNotificationId : null
  const selectedNotification = notifications.find((item) => item.id === activeNotificationId) || null
  const highPriority = notifications.filter((item) => item.priority === 'High').length
  const categoryColor: Record<string, string> = {
    Meeting: GOLD,
    Fees: RED,
    Academics: BLUE,
    Attendance: GREEN,
  }

  useEffect(() => {
    if (!activeNotificationId) return

    const element = document.getElementById(`notification-${activeNotificationId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeNotificationId])

  useEffect(() => {
    setSchoolNotices(getNoticesForRole('parent', []))
  }, [])

  const openNoticeView = (id: string) => {
    setSelectedNoticeId(id)
    setShowNoticeViewModal(true)
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Parent Notifications</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>Important school updates for the Okafor family.</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${GOLD}16`, border: `1px solid ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={16} color={GOLD} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#9B9590', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}>
                  School Notices
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5C5750' }}>Notices sent to students/parents.</p>
              </div>
            </div>

            {schoolNotices.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAllNoticesModal(true)}
                style={{ border: 'none', background: 'transparent', color: GOLD, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
              >
                View all
              </button>
            ) : null}
          </div>

          {schoolNotices.length === 0 ? (
            <p style={{ margin: 0, color: '#5C5750', fontSize: 13 }}>No notices yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {schoolNotices.slice(0, 5).map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => openNoticeView(notice.id)}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderLeft: notice.highlight ? `4px solid ${GOLD}` : `1px solid ${BORDER}`,
                    background: notice.highlight ? `${GOLD}10` : '#FFFFFF',
                    borderRadius: 12,
                    padding: '12px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 800 }}>{notice.title}</p>
                      <p style={{ margin: '4px 0 0', color: GOLD, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>{notice.audience}</p>
                    </div>
                    <span style={{ color: '#9B9590', fontSize: 11, whiteSpace: 'nowrap' }}>{notice.date}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.5 }}>{notice.body}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard label='Unread Alerts' value={`${notifications.length}`} sub='Family inbox' color={GOLD} />
        <StatCard label='Priority' value={`${highPriority}`} sub='Needs attention' color={RED} />
        <StatCard label='Children' value={`${mockData.children.length}`} sub='Linked profiles' color={BLUE} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNotification ? 'minmax(320px,0.85fr) minmax(420px,1.15fr)' : '1.25fr 0.75fr', gap: 16, alignItems: 'start' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', background: '#0D0D0D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: '#C9A020', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}>Notification Center</p>
              <p style={{ margin: '4px 0 0', color: '#FFFFFF', fontSize: 18, fontFamily: "'Georgia',serif" }}>Latest from Greenfield Academy</p>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#C9A020', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={20} color='#0D0D0D' />
            </div>
          </div>

          <div style={{ padding: '6px 20px 18px' }}>
            {notifications.map((item, index) => {
              const color = categoryColor[item.category] || GOLD
              const isSelected = item.id === activeNotificationId
              return (
                <Link
                  key={item.id}
                  href={`${baseHref}${baseHref.includes('?') ? '&' : '?'}notification=${item.id}`}
                  id={`notification-${item.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 14,
                    margin: '0 -10px',
                    padding: '16px 10px',
                    borderBottom: index < notifications.length - 1 ? `1px solid ${BORDER}` : 'none',
                    alignItems: 'start',
                    background: isSelected ? `${color}14` : 'transparent',
                    borderRadius: isSelected ? 10 : 0,
                    boxShadow: isSelected ? `0 0 0 1px ${color}33 inset` : 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}16`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.priority === 'High' ? <AlertCircle size={18} color={color} /> : <CheckCircle2 size={18} color={color} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                      <p style={{ margin: 0, color: '#0D0D0D', fontSize: 15, fontWeight: 700 }}>{item.title}</p>
                      <GoldBadge color={color}>{item.category}</GoldBadge>
                    </div>
                    <p style={{ margin: '0 0 8px', color: '#5C5750', fontSize: 13, lineHeight: 1.55 }}>{item.message}</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#9B9590', fontSize: 11 }}>
                        <UserRound size={13} /> {item.child}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#9B9590', fontSize: 11 }}>
                        <Clock size={13} /> {item.time}
                      </span>
                    </div>
                  </div>
                  <GoldBadge color={item.priority === 'High' ? RED : '#9B9590'}>{item.priority}</GoldBadge>
                </Link>
              )
            })}
          </div>
        </Card>

        {selectedNotification ? (
          <div
            id={`notification-page-${selectedNotification.id}`}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              minHeight: 760,
              maxWidth: 794,
              width: '100%',
              margin: '0 auto',
              boxShadow: '0 12px 34px rgba(13,13,13,0.10)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '28px 34px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: GOLD, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>Official Notification</p>
                <h3 style={{ margin: '8px 0 0', color: '#0D0D0D', fontSize: 28, lineHeight: 1.15, fontFamily: "'Georgia',serif", fontWeight: 400 }}>
                  {selectedNotification.title}
                </h3>
              </div>
              <button
                type='button'
                onClick={() => printElementById(`notification-page-${selectedNotification.id}`, `${selectedNotification.title} Notification`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0D0D0D', border: 'none', color: '#FFFFFF', fontSize: 12, padding: '9px 13px', borderRadius: 7, cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap' }}
              >
                <Printer size={14} /> Print
              </button>
            </div>

            <div style={{ padding: '28px 34px', display: 'grid', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12, padding: 16, background: '#FAFAF8', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                {[
                  ['Category', selectedNotification.category],
                  ['Priority', selectedNotification.priority],
                  ['Child', selectedNotification.child],
                  ['Time', selectedNotification.time],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ margin: 0, color: '#9B9590', fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ margin: '5px 0 0', color: '#0D0D0D', fontSize: 13, fontWeight: 800 }}>{value}</p>
                  </div>
                ))}
              </div>

              <div style={{ minHeight: 320 }}>
                <p style={{ margin: 0, color: '#5C5750', fontSize: 15, lineHeight: 1.85 }}>
                  {selectedNotification.message}
                </p>
                <p style={{ margin: '24px 0 0', color: '#5C5750', fontSize: 14, lineHeight: 1.8 }}>
                  Kindly treat this notice as an official communication from {mockData.schoolName}. Where action is required, please follow up with the school office or the assigned class teacher.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 18 }}>
                <div style={{ borderTop: `2px solid ${BORDER}`, paddingTop: 10, color: '#9B9590', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'center' }}>Parent / Guardian</div>
                <div style={{ borderTop: `2px solid ${BORDER}`, paddingTop: 10, color: '#9B9590', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'center' }}>School Administration</div>
              </div>
            </div>

            <div style={{ padding: '16px 34px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', gap: 12, color: '#9B9590', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' }}>
              <span>{mockData.schoolName}</span>
              <span style={{ color: GOLD }}>Generated by EduManage</span>
            </div>
          </div>
        ) : (
        <Card>
          <CardLabel>Family Snapshot</CardLabel>
          <div style={{ display: 'grid', gap: 12 }}>
            {mockData.children.map((child, index) => (
              <div key={child.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: index < mockData.children.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <Avatar initials={child.avatar} size={38} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#0D0D0D', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.name}</p>
                  <p style={{ margin: '3px 0 0', color: '#9B9590', fontSize: 11 }}>{child.class} / {child.level}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: '#C9A02012', border: '1px solid #C9A02033' }}>
            <p style={{ margin: 0, color: '#8B6E10', fontSize: 13, lineHeight: 1.55, fontWeight: 600 }}>You have {highPriority} priority updates waiting for parent action this week.</p>
          </div>
        </Card>
        )}
      </div>
    </div>
  )
}

export function SchoolPolicyHandbook({ role }: { role: RoleType }) {
  const keyPolicies = [
    {
      title: 'Attendance & Punctuality',
      text: 'Students are expected to be in school before 7:45 AM. Repeated lateness, unexplained absence, or early pickup must be discussed with the class teacher.',
    },
    {
      title: 'Uniform & Appearance',
      text: 'Complete school uniform, proper footwear, student ID, and neat grooming are required on all school days and official activities.',
    },
    {
      title: 'Digital Conduct',
      text: 'Phones, tablets, and internet access must be used only when approved for learning. Recording, sharing, or posting school content without permission is not allowed.',
    },
    {
      title: 'Assessment Integrity',
      text: 'Students must complete tests, assignments, projects, and examinations honestly. Any form of cheating or impersonation is treated as a serious misconduct issue.',
    },
  ]

  const handbookSections = [
    ['Daily Arrival', 'Morning assembly begins at 7:50 AM. Students should report to class immediately after assembly.'],
    ['Health & Safety', 'Report illness, injury, bullying, unsafe behavior, or damaged facilities to a teacher, nurse, or administrator immediately.'],
    ['Parent Communication', 'Parents should use official portal messages, class teacher contact hours, or scheduled office visits for school matters.'],
    ['Homework & Projects', 'Assignments should be submitted by the due date with the student name, class, subject, and teacher clearly stated.'],
    ['Library & Labs', 'Books, laboratory materials, sports equipment, and ICT devices must be handled carefully and returned in good condition.'],
    ['Discipline Steps', 'Correction may include verbal guidance, written reflection, parent conference, community service, suspension, or referral to management.'],
  ]

  const quickFacts = [
    ['School Day', '7:45 AM - 3:00 PM'],
    ['Class Teacher', mockData.student.formTeacher],
    ['Current Term', `${mockData.term}, ${mockData.session}`],
    ['Applies To', role === 'parent' ? 'All linked children' : mockData.student.class],
  ]

  return (
    <div>
      <div className='policy-hero' style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(260px,0.75fr)', gap: 16, marginBottom: 18, alignItems: 'stretch' }}>
        <Card style={{ background: '#0D0D0D', color: '#FFFFFF', borderColor: '#222', overflow: 'hidden', position: 'relative', minHeight: 250 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(201,160,32,0.22), rgba(55,138,221,0.10) 42%, rgba(29,158,117,0.12))' }} />
          <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: GOLD, color: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookMarked size={25} />
            </div>
            <div>
              <p style={{ margin: 0, color: GOLD, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 900 }}>{mockData.schoolName}</p>
              <h2 style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 34, lineHeight: 1.12, fontFamily: "'Georgia',serif", fontWeight: 400 }}>School Policy & Student Handbook</h2>
              <p style={{ margin: '12px 0 0', color: '#F5F0E8', fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
                A single reference for conduct, attendance, safety, academic expectations, and parent-student responsibilities.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <GoldBadge>Updated {mockData.session}</GoldBadge>
              <GoldBadge color={BLUE}>{role === 'parent' ? 'Parent Copy' : 'Student Copy'}</GoldBadge>
              <GoldBadge color={GREEN}>Active Policy</GoldBadge>
            </div>
          </div>
        </Card>

        <Card style={{ display: 'grid', gap: 12 }}>
          <CardLabel>Quick Reference</CardLabel>
          {quickFacts.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: label !== 'Applies To' ? `1px solid ${BORDER}` : 'none' }}>
              <span style={{ color: '#9B9590', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
              <span style={{ color: '#0D0D0D', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
          <button
            type='button'
            onClick={() => window.print()}
            style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0D0D0D', border: 'none', color: '#FFFFFF', borderRadius: 8, padding: '11px 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
          >
            <Printer size={14} /> Print Handbook
          </button>
        </Card>
      </div>

      <div className='policy-grid' style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.95fr) minmax(0,1.05fr)', gap: 16, alignItems: 'start' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <CardLabel>Core School Policies</CardLabel>
            <GoldBadge color={RED}>Mandatory</GoldBadge>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {keyPolicies.map((policy, index) => (
              <div key={policy.title} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 12, paddingBottom: index < keyPolicies.length - 1 ? 12 : 0, borderBottom: index < keyPolicies.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${GOLD}14`, border: `1px solid ${GOLD}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontWeight: 900, fontFamily: 'monospace' }}>
                  {index + 1}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#0D0D0D', fontSize: 15, fontWeight: 850 }}>{policy.title}</h3>
                  <p style={{ margin: '6px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.6 }}>{policy.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <CardLabel>Student Handbook</CardLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: GREEN, fontSize: 12, fontWeight: 900 }}>
              <CheckCircle2 size={15} /> Available
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            {handbookSections.map(([title, text]) => (
              <div key={title} style={{ background: '#FAFAF8', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 13, minHeight: 120 }}>
                <h3 style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 850 }}>{title}</h3>
                <p style={{ margin: '8px 0 0', color: '#5C5750', fontSize: 12, lineHeight: 1.55 }}>{text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 16, background: `${BLUE}0D`, borderColor: `${BLUE}33` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start' }}>
          <AlertCircle size={20} color={BLUE} />
          <div>
            <p style={{ margin: 0, color: '#0D0D0D', fontSize: 14, fontWeight: 900 }}>Acknowledgement</p>
            <p style={{ margin: '6px 0 0', color: '#5C5750', fontSize: 13, lineHeight: 1.65 }}>
              Students and parents are expected to review this handbook each term. Questions should be directed to the class teacher or school administration through the official portal.
            </p>
          </div>
        </div>
      </Card>

      <style jsx>{`
        @media (max-width: 900px) {
          .policy-hero,
          .policy-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

export function StudentProjects() {
  const projects = mockData.student.projects
  const featured = projects[0]
  const [expandedProject, setExpandedProject] = useState<string | null>(featured.title)
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, { note: string; fileName: string }>>({})
  const [submittedProjects, setSubmittedProjects] = useState<Record<string, { note: string; fileName: string; submittedAt: string }>>({})
  const statusColor: Record<string, string> = {
    'In Progress': GOLD,
    'Draft Review': BLUE,
    'Not Started': '#9B9590',
  }

  const updateDraft = (title: string, field: 'note' | 'fileName', value: string) => {
    setSubmissionDrafts((current) => ({
      ...current,
      [title]: {
        note: current[title]?.note || '',
        fileName: current[title]?.fileName || '',
        [field]: value,
      },
    }))
  }

  const submitAssignment = (title: string) => {
    const draft = submissionDrafts[title]
    if (!draft?.note && !draft?.fileName) return

    setSubmittedProjects((current) => ({
      ...current,
      [title]: {
        note: draft.note,
        fileName: draft.fileName || 'No file attached',
        submittedAt: new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
    }))
    setSubmissionDrafts((current) => ({
      ...current,
      [title]: { note: '', fileName: '' },
    }))
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Assignments/Projects</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>Assignments and projects from subject teachers for {mockData.student.name}.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <Card style={{ background: '#0D0D0D', borderColor: '#222', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -36, top: -36, width: 130, height: 130, borderRadius: '50%', border: '28px solid rgba(201,160,32,0.15)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 26 }}>
              <div>
                <p style={{ margin: 0, color: '#C9A020', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}>Featured Assignment</p>
                <h3 style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 25, lineHeight: 1.15, fontFamily: "'Georgia',serif", fontWeight: 400 }}>{featured.title}</h3>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#C9A020', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardList size={22} color='#0D0D0D' />
              </div>
            </div>
            <p style={{ margin: '0 0 18px', color: '#F5F0E8', fontSize: 13, lineHeight: 1.65 }}>{featured.brief}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <GoldBadge>{featured.subject}</GoldBadge>
              <GoldBadge color={BLUE}>Teacher: {featured.teacher}</GoldBadge>
              <GoldBadge color={GREEN}>Due {featured.dueDate}</GoldBadge>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <StatCard label='Total Work' value={`${projects.length}`} sub='Assigned this term' color={GOLD} />
          <StatCard label='Teachers' value='3' sub='Giving work' color={BLUE} />
          <StatCard label='Next Due' value='Mar 8' sub={featured.subject} color={RED} />
          <StatCard label='Submitted' value={`${Object.keys(submittedProjects).length}`} sub='Completed uploads' color={GREEN} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {projects.map((project) => {
          const color = statusColor[project.status] || GOLD
          const expanded = expandedProject === project.title
          const draft = submissionDrafts[project.title] || { note: '', fileName: '' }
          const submitted = submittedProjects[project.title]
          return (
            <Card key={project.title} style={{ display: 'flex', flexDirection: 'column', minHeight: 278 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}16`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookMarked size={19} color={color} />
                </div>
                <GoldBadge color={submitted ? GREEN : color}>{submitted ? 'Submitted' : project.status}</GoldBadge>
              </div>
              <h3 style={{ margin: 0, color: '#0D0D0D', fontSize: 18, lineHeight: 1.2, fontFamily: "'Georgia',serif", fontWeight: 400 }}>{project.title}</h3>
              <p style={{ margin: '10px 0 16px', color: '#5C5750', fontSize: 13, lineHeight: 1.6, flex: 1 }}>{project.brief}</p>
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#5C5750', fontSize: 12 }}>
                  <UserRound size={14} color={BLUE} /> {project.teacher}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#5C5750', fontSize: 12 }}>
                  <CalendarDays size={14} color={RED} /> Due {project.dueDate}
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9B9590', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase' }}>{project.subject}</span>
                  <span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{project.progress}%</span>
                </div>
                <div style={{ height: 7, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${project.progress}%`, height: '100%', background: color, borderRadius: 99 }} />
                </div>
              </div>
              <button
                type='button'
                onClick={() => setExpandedProject(expanded ? null : project.title)}
                style={{
                  marginTop: 14,
                  border: `1px solid ${BLUE}44`,
                  background: expanded ? `${BLUE}14` : '#FFFFFF',
                  color: BLUE,
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {expanded ? 'Hide Details' : 'View More'}
              </button>

              {expanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: 'grid', gap: 12 }}>
                  <div style={{ background: '#FAFAF8', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
                    <p style={{ margin: '0 0 6px', color: '#0D0D0D', fontSize: 13, fontWeight: 800 }}>Assignment Details</p>
                    <p style={{ margin: 0, color: '#5C5750', fontSize: 12, lineHeight: 1.6 }}>
                      Submit your completed work before {project.dueDate}. Include your name, class, and subject on the first page. Your teacher will review the upload and update your status.
                    </p>
                  </div>

                  {submitted && (
                    <div style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}33`, borderRadius: 10, padding: 12 }}>
                      <p style={{ margin: 0, color: GREEN, fontSize: 12, fontWeight: 800 }}>Submitted on {submitted.submittedAt}</p>
                      <p style={{ margin: '5px 0 0', color: '#5C5750', fontSize: 12 }}>File: {submitted.fileName}</p>
                      {submitted.note && <p style={{ margin: '5px 0 0', color: '#5C5750', fontSize: 12, lineHeight: 1.5 }}>Note: {submitted.note}</p>}
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: 9 }}>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ color: '#5C5750', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Submission Note</span>
                      <textarea
                        value={draft.note}
                        onChange={(event) => updateDraft(project.title, 'note', event.target.value)}
                        placeholder='Add a short note for your teacher...'
                        rows={3}
                        style={{ width: '100%', resize: 'vertical', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, color: '#0D0D0D', fontSize: 13, outlineColor: BLUE }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ color: '#5C5750', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Attach File</span>
                      <input
                        type='file'
                        onChange={(event) => updateDraft(project.title, 'fileName', event.target.files?.[0]?.name || '')}
                        style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 9, color: '#5C5750', fontSize: 12, background: '#FFFFFF' }}
                      />
                    </label>
                    <button
                      type='button'
                      onClick={() => submitAssignment(project.title)}
                      disabled={!draft.note && !draft.fileName}
                      style={{
                        border: 'none',
                        background: !draft.note && !draft.fileName ? '#E8E4DC' : GOLD,
                        color: '#0D0D0D',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: !draft.note && !draft.fileName ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Submit Assignment
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function ParentSwitch({ activeChild, setActiveChild }: { activeChild: number; setActiveChild: (index: number) => void }) {
  const levelColor: Record<string, string> = { 'Senior Secondary': GOLD, 'Junior Secondary': BLUE, 'Primary School': GREEN }
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>My Children</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>{mockData.schoolName} · {mockData.session}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {mockData.children.map((child, index) => (
          <div
            key={index}
            onClick={() => setActiveChild(index)}
            style={{
              background: '#FFFFFF',
              border: `2px solid ${activeChild === index ? GOLD : BORDER}`,
              borderRadius: 14,
              padding: '22px 18px',
              cursor: 'pointer',
              boxShadow: activeChild === index ? `0 4px 20px ${GOLD}22` : '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'all 0.2s',
            }}
          >
            <Avatar initials={child.avatar} size={48} />
            <p style={{ margin: '12px 0 3px', fontSize: 16, color: '#0D0D0D', fontFamily: "'Georgia',serif" }}>{child.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9B9590', fontFamily: 'monospace' }}>{child.id}</p>
            <GoldBadge color={levelColor[child.level] || GOLD}>{child.class}</GoldBadge>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#5C5750' }}>{child.level}</p>
            {activeChild === index && (
              <div style={{ marginTop: 12, padding: '6px 12px', background: `${GOLD}14`, borderRadius: 6, border: `1px solid ${GOLD}44` }}>
                <p style={{ margin: 0, fontSize: 11, color: GOLD, fontWeight: 700 }}>✓ CURRENTLY VIEWING</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <Card>
        <CardLabel>Quick Summary — {mockData.children[activeChild].name}</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <StatCard label='Class' value={mockData.children[activeChild].class} sub={mockData.children[activeChild].level} color={GOLD} />
          <AttendanceBarChart compact />
          <StatCard label='Fees Due' value='₦35k' sub='Balance' color={RED} />
          <StatCard label='Position' value='4th' sub='In class' color={BLUE} />
        </div>
      </Card>
    </div>
  )
}

