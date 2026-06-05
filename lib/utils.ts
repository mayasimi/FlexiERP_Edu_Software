import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, fmt = 'MMM dd, yyyy') {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-700',
    optimal: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-800',
    'pending review': 'bg-gray-100 text-gray-700',
    'under evaluation': 'bg-blue-100 text-blue-700',
    waitlisted: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-700',
    'low stock': 'bg-orange-100 text-orange-700',
    'on leave': 'bg-orange-100 text-orange-700',
  }
  return map[status.toLowerCase()] || 'bg-gray-100 text-gray-700'
}

export type ClassDirectoryItem = {
  id: string
  level: string
  sections?: string
  capacity_used?: number
  capacity_total?: number
  lead_faculty?: string
}

export const CLASS_DIRECTORY_STORAGE_KEY = 'edu_class_directory_v1'

export function getClassLevelsFromDirectory(fallback: string[]) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(CLASS_DIRECTORY_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return fallback
    const levels = parsed
      .map((x) => (x as ClassDirectoryItem)?.level)
      .map((v) => (v ?? '').toString().trim())
      .filter(Boolean)
    return levels.length ? Array.from(new Set(levels)) : fallback
  } catch {
    return fallback
  }
}

export function getSectionsFromDirectory(level: string) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLASS_DIRECTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const item = parsed.find((x) => ((x as ClassDirectoryItem)?.level ?? '').toString().trim() === level) as ClassDirectoryItem | undefined
    const sectionsRaw = (item?.sections ?? '').toString()
    const tokens = sectionsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (/^[A-Za-z]$/.test(s) ? `Section ${s.toUpperCase()}` : s))
    return Array.from(new Set(tokens))
  } catch {
    return []
  }
}

export type AcademicTerm = {
  id: string
  name: string
  start: string
  end: string
  weeks: number
  status: string
  year?: string
}

export const ACADEMIC_TERMS_STORAGE_KEY = 'edu_academic_terms_v1'
export const ACTIVE_TERM_ID_STORAGE_KEY = 'edu_active_term_id_v1'

export function getAcademicTerms(fallback: AcademicTerm[]) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(ACADEMIC_TERMS_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return fallback
    const terms = parsed
      .map((x) => ({
        id: (x as any)?.id?.toString?.() ?? `term-${Date.now()}`,
        name: ((x as any)?.name ?? '').toString(),
        start: ((x as any)?.start ?? '').toString(),
        end: ((x as any)?.end ?? '').toString(),
        weeks: Number((x as any)?.weeks ?? 0) || 0,
        status: ((x as any)?.status ?? '').toString(),
        year: ((x as any)?.year ?? '').toString() || undefined,
      }))
      .filter((t) => t.name.trim().length > 0)
    return terms.length ? terms : fallback
  } catch {
    return fallback
  }
}

export function getActiveTermId(fallback = '') {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = (window.localStorage.getItem(ACTIVE_TERM_ID_STORAGE_KEY) ?? '').trim()
    if (stored) return stored
    const terms = getAcademicTerms([])
    const active = terms.find((t) => (t.status ?? '').toLowerCase() === 'active')
    return active?.id ?? fallback
  } catch {
    return fallback
  }
}

export function getActiveTermLabel(fallbackLabel = '') {
  if (typeof window === 'undefined') return fallbackLabel
  try {
    const terms = getAcademicTerms([])
    const activeId = getActiveTermId('')
    const found = activeId ? terms.find((t) => t.id === activeId) : terms.find((t) => (t.status ?? '').toLowerCase() === 'active')
    return found?.name ?? fallbackLabel
  } catch {
    return fallbackLabel
  }
}

export function withActiveTermKey(baseKey: string) {
  if (typeof window === 'undefined') return baseKey
  const termId = getActiveTermId('')
  return termId ? `${baseKey}::${termId}` : baseKey
}

export function withTermKey(baseKey: string, termId: string) {
  if (!termId) return baseKey
  return `${baseKey}::${termId}`
}

export type NoticeItem = {
  id: string
  title: string
  audience: string
  body: string
  date: string
  highlight?: boolean
}

export const NOTICE_STORAGE_KEY = 'edu_notice_board_v1'

type NoticeAudienceGroup = 'all' | 'staff' | 'students'
export type NoticeViewerRole = 'staff' | 'student' | 'parent'

function normalizeNoticeAudienceGroup(audience: string): NoticeAudienceGroup {
  const a = (audience ?? '').toString().trim().toLowerCase()
  if (!a) return 'all'
  if (a.includes('all')) return 'all'
  if (a.includes('staff') || a.includes('faculty') || a.includes('teacher')) return 'staff'
  if (a.includes('student') || a.includes('grade') || a.includes('class')) return 'students'
  return 'all'
}

export function getNoticeBoard(fallback: NoticeItem[] = []) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(NOTICE_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return fallback
    const next = parsed
      .map((x) => ({
        id: (x as any)?.id?.toString?.() ?? `notice-${Date.now()}`,
        title: ((x as any)?.title ?? '').toString(),
        audience: ((x as any)?.audience ?? '').toString(),
        body: ((x as any)?.body ?? '').toString(),
        date: ((x as any)?.date ?? '').toString(),
        highlight: Boolean((x as any)?.highlight),
      }))
      .filter((n) => n.title.trim().length > 0)
    return next.length ? next : fallback
  } catch {
    return fallback
  }
}

export function filterNoticesForRole(notices: NoticeItem[], role: NoticeViewerRole) {
  const groupAllowed = (group: NoticeAudienceGroup) => {
    if (group === 'all') return true
    if (group === 'staff') return role === 'staff'
    return role === 'student' || role === 'parent'
  }
  return notices.filter((n) => groupAllowed(normalizeNoticeAudienceGroup(n.audience)))
}

export function getNoticesForRole(role: NoticeViewerRole, fallback: NoticeItem[] = []) {
  return filterNoticesForRole(getNoticeBoard(fallback), role)
}
