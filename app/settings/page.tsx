'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { useRouter } from 'next/navigation'
import { settingsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Megaphone, Trash2, X } from 'lucide-react'
import { ACADEMIC_TERMS_STORAGE_KEY, ACTIVE_TERM_ID_STORAGE_KEY, CLASS_DIRECTORY_STORAGE_KEY, type AcademicTerm, type ClassDirectoryItem, withTermKey } from '@/lib/utils'

type ClassRow = Required<Pick<ClassDirectoryItem, 'id' | 'level' | 'sections' | 'capacity_used' | 'capacity_total' | 'lead_faculty'>>

const MOCK_CLASSES: ClassRow[] = [
  { id: '1', level: 'Nursery', sections: 'A, B', capacity_used: 40, capacity_total: 50, lead_faculty: 'Sarah Jenkins' },
  { id: '2', level: 'Grade 1', sections: 'A, B, C', capacity_used: 85, capacity_total: 90, lead_faculty: 'Michael Chen' },
  { id: '3', level: 'Grade 10', sections: 'Science, Arts', capacity_used: 110, capacity_total: 120, lead_faculty: 'Dr. Robert Vance' },
]
const MOCK_TERMS: AcademicTerm[] = [
  { id: '1', name: 'Fall Term 2023', start: 'Sept 1', end: 'Dec 15', weeks: 14, status: 'Active' },
  { id: '2', name: 'Spring Term 2024', start: 'Jan 10', end: 'May 20', weeks: 18, status: 'Upcoming' },
]
const MOCK_NOTICES = [
  { id: '1', title: 'Emergency Weather Protocol', audience: 'ALL STAFF & STUDENTS', body: 'Please review the updated winter weather protocols. In case of heavy snow, school…', date: 'Today', highlight: true },
  { id: '2', title: 'Faculty Meeting Rescheduled', audience: 'STAFF ONLY', body: 'The monthly departmental review has been moved from Tuesday to Thursday afterno…', date: 'Yesterday', highlight: false },
  { id: '3', title: 'End of Term Examinations Schedule', audience: 'STUDENTS ONLY', body: 'The preliminary schedule for the Fall term finals has been posted. Please ensure all…', date: 'Oct 12', highlight: false },
]

const NOTICE_STORAGE_KEY = 'edu_notice_board_v1'
const ACADEMIC_YEAR_STORAGE_KEY = 'edu_academic_year_v1'
const ACADEMIC_YEARS_STORAGE_KEY = 'edu_academic_years_v1'
const MARKS_STORAGE_KEY = 'edu_instructor_assessment_marks_v1'
const BEHAVIOUR_SKILL_MARKS_STORAGE_KEY = 'edu_instructor_behaviour_skill_marks_v1'
const FEE_ITEMS_STORAGE_KEY = 'edu_fee_items_v1'
const FEE_TRANSACTIONS_STORAGE_KEY = 'edu_fee_transactions_v1'
const GENERAL_SETTINGS_STORAGE_KEY = 'edu_general_settings_v1'

type GeneralSettings = {
  school_name: string
  school_logo_data_url: string
  main_address: string
  phone_number: string
  email: string
  website_url: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [year, setYear] = useState('2023 - 2024')
  const [hasMounted, setHasMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'class-term' | 'general'>('class-term')
  const [years, setYears] = useState<string[]>(['2023 - 2024', '2024 - 2025'])
  const [showYearModal, setShowYearModal] = useState(false)
  const [newYearStart, setNewYearStart] = useState('')
  const [newYearEnd, setNewYearEnd] = useState('')

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    school_name: '',
    school_logo_data_url: '',
    main_address: '',
    phone_number: '',
    email: '',
    website_url: '',
  })
  const [hasLoadedGeneralSettings, setHasLoadedGeneralSettings] = useState(false)
  const [generalSettingsDirty, setGeneralSettingsDirty] = useState(false)

  const { data: noticesFromApi = MOCK_NOTICES } = useQuery({
    queryKey: ['settings-notices'],
    queryFn: () => settingsApi.getNotices().then(r => r.data),
    placeholderData: MOCK_NOTICES,
  })

  const [notices, setNotices] = useState<typeof MOCK_NOTICES>(MOCK_NOTICES)
  const [hasLoadedNotices, setHasLoadedNotices] = useState(false)

  const [classes, setClasses] = useState<ClassRow[]>(MOCK_CLASSES)
  const [showAllClassesModal, setShowAllClassesModal] = useState(false)
  const [terms, setTerms] = useState<AcademicTerm[]>(MOCK_TERMS)
  const [activeTermId, setActiveTermId] = useState<string>('')

  useEffect(() => setHasMounted(true), [])

  useEffect(() => {
    if (!hasMounted) return
    if (typeof window === 'undefined') return
    const read = () => {
      const tab = new URLSearchParams(window.location.search).get('tab')
      setActiveTab(tab === 'general' ? 'general' : 'class-term')
    }
    read()
    window.addEventListener('locationchange', read)
    return () => window.removeEventListener('locationchange', read)
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const stored = (window.localStorage.getItem(ACADEMIC_YEAR_STORAGE_KEY) ?? '').trim()
      if (stored) setYear(stored)
    } catch {
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem(ACADEMIC_YEARS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return
      const next = parsed.map((x) => (x ?? '').toString().trim()).filter(Boolean)
      if (next.length) setYears(next)
    } catch {
    }
  }, [hasMounted])

  const getAcademicYearStart = (value: string) => {
    const m = (value ?? '').toString().match(/(19|20)\d{2}/)
    return m ? Number(m[0]) : Number.POSITIVE_INFINITY
  }

  const sortAcademicYearsAsc = (list: string[]) => {
    return [...list]
      .map((x) => (x ?? '').toString().trim())
      .filter(Boolean)
      .sort((a, b) => {
        const ay = getAcademicYearStart(a)
        const by = getAcademicYearStart(b)
        if (ay !== by) return ay - by
        return a.localeCompare(b)
      })
  }

  const yearNumberOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const start = current - 10
    const end = current + 10
    const out: number[] = []
    for (let y = start; y <= end; y += 1) out.push(y)
    return out
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    setYears((prev) => {
      const sorted = sortAcademicYearsAsc(prev)
      const normalizedYear = year.trim()
      if (!normalizedYear) return sorted
      if (sorted.some((y) => y.toLowerCase() === normalizedYear.toLowerCase())) return sorted
      return sortAcademicYearsAsc([...sorted, normalizedYear])
    })
  }, [hasMounted, year])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(ACADEMIC_YEAR_STORAGE_KEY, year)
    } catch {
    }
  }, [hasMounted, year])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(ACADEMIC_YEARS_STORAGE_KEY, JSON.stringify(years))
    } catch {
    }
  }, [hasMounted, years])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem(CLASS_DIRECTORY_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return
      const next: ClassRow[] = parsed
        .map((x) => ({
          id: (x as any)?.id?.toString?.() ?? `cls-${Date.now()}`,
          level: ((x as any)?.level ?? '').toString(),
          sections: ((x as any)?.sections ?? '').toString(),
          capacity_used: Number((x as any)?.capacity_used ?? 0) || 0,
          capacity_total: Number((x as any)?.capacity_total ?? 0) || 0,
          lead_faculty: ((x as any)?.lead_faculty ?? '').toString(),
        }))
        .filter((x) => x.level.trim().length > 0)
      if (next.length) setClasses(next)
    } catch {
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(CLASS_DIRECTORY_STORAGE_KEY, JSON.stringify(classes))
    } catch {
    }
  }, [classes, hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    if (hasLoadedNotices) return
    try {
      const raw = window.localStorage.getItem(NOTICE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
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
          if (next.length) setNotices(next as any)
        }
      } else {
        setNotices(noticesFromApi as any)
      }
    } catch {
      setNotices(noticesFromApi as any)
    } finally {
      setHasLoadedNotices(true)
    }
  }, [hasMounted, hasLoadedNotices, noticesFromApi])

  useEffect(() => {
    if (!hasMounted) return
    if (!hasLoadedNotices) return
    try {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(notices))
    } catch {
    }
  }, [hasMounted, hasLoadedNotices, notices])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem(ACADEMIC_TERMS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return
      const next = parsed
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
      if (next.length) setTerms(next)
    } catch {
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const stored = (window.localStorage.getItem(ACTIVE_TERM_ID_STORAGE_KEY) ?? '').trim()
      if (stored) {
        setActiveTermId(stored)
        return
      }
      const active = terms.find((t) => (t.status ?? '').toLowerCase() === 'active')
      if (active?.id) setActiveTermId(active.id)
    } catch {
    }
  }, [hasMounted, terms])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(ACADEMIC_TERMS_STORAGE_KEY, JSON.stringify(terms))
    } catch {
    }
  }, [terms, hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      if (activeTermId) window.localStorage.setItem(ACTIVE_TERM_ID_STORAGE_KEY, activeTermId)
    } catch {
    }
  }, [activeTermId, hasMounted])

  const logoInputRef = useRef<HTMLInputElement>(null)

  const updateGeneralSettings = (patch: Partial<GeneralSettings>) => {
    setGeneralSettings((prev) => ({ ...prev, ...patch }))
    setGeneralSettingsDirty(true)
  }

  useEffect(() => {
    if (!hasMounted) return
    if (hasLoadedGeneralSettings) return
    try {
      const raw = window.localStorage.getItem(GENERAL_SETTINGS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GeneralSettings>
        setGeneralSettings((prev) => ({
          ...prev,
          school_name: (parsed.school_name ?? prev.school_name).toString(),
          school_logo_data_url: (parsed.school_logo_data_url ?? prev.school_logo_data_url).toString(),
          main_address: (parsed.main_address ?? prev.main_address).toString(),
          phone_number: (parsed.phone_number ?? prev.phone_number).toString(),
          email: (parsed.email ?? prev.email).toString(),
          website_url: (parsed.website_url ?? prev.website_url).toString(),
        }))
      }
    } catch {
    } finally {
      setHasLoadedGeneralSettings(true)
      setGeneralSettingsDirty(false)
    }
  }, [hasLoadedGeneralSettings, hasMounted])

  const saveGeneralSettings = () => {
    if (!hasMounted || !hasLoadedGeneralSettings) return
    try {
      window.localStorage.setItem(GENERAL_SETTINGS_STORAGE_KEY, JSON.stringify(generalSettings))
      setGeneralSettingsDirty(false)
      toast.success('General settings saved.')
    } catch {
      toast.error('Could not save general settings.')
    }
  }

  const onPickLogo = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      if (!text) return
      updateGeneralSettings({ school_logo_data_url: text })
    }
    reader.readAsDataURL(file)
  }

  const [showClassModal, setShowClassModal] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [formLevel, setFormLevel] = useState('')
  const [formSections, setFormSections] = useState('')
  const [formCapUsed, setFormCapUsed] = useState('0')
  const [formCapTotal, setFormCapTotal] = useState('0')
  const [formLead, setFormLead] = useState('')

  const openAddClass = () => {
    setEditingClassId(null)
    setFormLevel('')
    setFormSections('')
    setFormCapUsed('0')
    setFormCapTotal('0')
    setFormLead('')
    setShowClassModal(true)
  }

  const openEditClass = (cls: ClassRow) => {
    setEditingClassId(cls.id)
    setFormLevel(cls.level)
    setFormSections(cls.sections)
    setFormCapUsed(String(cls.capacity_used))
    setFormCapTotal(String(cls.capacity_total))
    setFormLead(cls.lead_faculty)
    setShowClassModal(true)
  }

  const saveClass = () => {
    const level = formLevel.trim()
    const sections = formSections.trim()
    const capUsed = Number(formCapUsed)
    const capTotal = Number(formCapTotal)
    const lead = formLead.trim()

    if (!level) return toast.error('Please enter a class level.')
    if (!sections) return toast.error('Please enter sections (comma-separated).')
    if (!Number.isFinite(capUsed) || capUsed < 0) return toast.error('Please enter a valid used capacity.')
    if (!Number.isFinite(capTotal) || capTotal <= 0) return toast.error('Please enter a valid total capacity.')
    if (capUsed > capTotal) return toast.error('Used capacity cannot be greater than total capacity.')

    setClasses((prev) => {
      if (editingClassId) {
        return prev.map((c) =>
          c.id === editingClassId ? { ...c, level, sections, capacity_used: capUsed, capacity_total: capTotal, lead_faculty: lead } : c
        )
      }
      const next: ClassRow = {
        id: `cls-${Date.now()}`,
        level,
        sections,
        capacity_used: capUsed,
        capacity_total: capTotal,
        lead_faculty: lead,
      }
      return [next, ...prev]
    })
    toast.success(editingClassId ? 'Class updated.' : 'Class added.')
    setShowClassModal(false)
  }

  const removeClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    toast.success('Class removed.')
  }

  const uniqueLevels = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const c of classes) {
      const v = (c.level ?? '').trim()
      if (!v) continue
      const k = v.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
    }
    return out
  }, [classes])

  const [showTermModal, setShowTermModal] = useState(false)
  const [editingTermId, setEditingTermId] = useState<string | null>(null)
  const [formTermName, setFormTermName] = useState('')
  const [formTermStart, setFormTermStart] = useState('')
  const [formTermEnd, setFormTermEnd] = useState('')
  const [formTermWeeks, setFormTermWeeks] = useState('0')
  const [formTermStatus, setFormTermStatus] = useState<'Upcoming' | 'Closed'>('Upcoming')

  const [showTermHistoryModal, setShowTermHistoryModal] = useState(false)
  const [historyYear, setHistoryYear] = useState('')
  const [historyTermId, setHistoryTermId] = useState('')
  const [historySearch, setHistorySearch] = useState('')

  const yearOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    const add = (v: string) => {
      const value = (v ?? '').toString().trim()
      if (!value) return
      const k = value.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      out.push(value)
    }
    add(year)
    for (const y of years) add(y)
    for (const t of terms) add(t.year ?? '')
    const sorted = sortAcademicYearsAsc(out)
    return sorted.length ? sorted : [year]
  }, [terms, year, years])

  const filteredHistoryTerms = useMemo(() => {
    const y = (historyYear || year).trim().toLowerCase()
    const q = historySearch.trim().toLowerCase()
    return terms
      .filter((t) => {
        const termYear = (t.year ?? year).toString().trim().toLowerCase()
        if (y && termYear !== y) return false
        if (!q) return true
        const hay = `${t.name} ${t.status} ${t.start} ${t.end}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const sa = (a.status ?? '').toLowerCase()
        const sb = (b.status ?? '').toLowerCase()
        if (sa === sb) return (b.id ?? '').localeCompare(a.id ?? '')
        if (sa === 'active') return -1
        if (sb === 'active') return 1
        if (sa === 'closed') return -1
        if (sb === 'closed') return 1
        return 0
      })
  }, [historySearch, historyYear, terms, year])

  const historySummary = useMemo(() => {
    if (!hasMounted || !historyTermId) return null
    try {
      const marksRaw = window.localStorage.getItem(withTermKey(MARKS_STORAGE_KEY, historyTermId)) ?? ''
      const marks = marksRaw ? (JSON.parse(marksRaw) as Record<string, Record<string, any>>) : {}
      const selectionCount = Object.keys(marks).length
      const studentCount = Object.values(marks).reduce((sum, per) => sum + Object.keys(per ?? {}).length, 0)

      const bsRaw = window.localStorage.getItem(withTermKey(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY, historyTermId)) ?? ''
      const bs = bsRaw ? (JSON.parse(bsRaw) as Record<string, Record<string, any>>) : {}
      const bsGroupCount = Object.keys(bs).length
      const bsStudentCount = Object.values(bs).reduce((sum, per) => sum + Object.keys(per ?? {}).length, 0)

      const feeItemsRaw = window.localStorage.getItem(withTermKey(FEE_ITEMS_STORAGE_KEY, historyTermId)) ?? ''
      const feeItems = feeItemsRaw ? (JSON.parse(feeItemsRaw) as any[]) : []

      const feeTxRaw = window.localStorage.getItem(withTermKey(FEE_TRANSACTIONS_STORAGE_KEY, historyTermId)) ?? ''
      const feeTx = feeTxRaw ? (JSON.parse(feeTxRaw) as any[]) : []
      const totalCollected = feeTx.reduce((sum, t) => sum + (Number(t?.amount ?? 0) || 0), 0)

      return {
        selectionCount,
        studentCount,
        bsGroupCount,
        bsStudentCount,
        feeItemCount: Array.isArray(feeItems) ? feeItems.length : 0,
        feeTxCount: Array.isArray(feeTx) ? feeTx.length : 0,
        totalCollected,
      }
    } catch {
      return null
    }
  }, [hasMounted, historyTermId])

  const openTermHistory = () => {
    setHistoryYear(year)
    const preferred = terms.find((t) => (t.status ?? '').toLowerCase() === 'closed' && (t.year ?? year) === year) ?? terms.find((t) => (t.status ?? '').toLowerCase() === 'closed') ?? null
    setHistoryTermId(preferred?.id ?? '')
    setHistorySearch('')
    setShowTermHistoryModal(true)
  }

  const openAddYear = () => {
    const now = new Date()
    const y = now.getFullYear()
    setNewYearStart(String(y))
    setNewYearEnd(String(y + 1))
    setShowYearModal(true)
  }

  const saveYear = () => {
    const start = Number(newYearStart)
    const end = Number(newYearEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return toast.error('Please select a valid start and end year.')
    if (end <= start) return toast.error('End year must be greater than start year.')
    const v = `${start} - ${end}`
    setYears((prev) => {
      const normalized = v.toLowerCase()
      const rest = prev.filter((x) => x.toLowerCase() !== normalized)
      return sortAcademicYearsAsc([...rest, v])
    })
    setShowYearModal(false)
    toast.success('Academic year saved.')
  }

  const openAddTerm = () => {
    setEditingTermId(null)
    setFormTermName('')
    setFormTermStart('')
    setFormTermEnd('')
    setFormTermWeeks('0')
    setFormTermStatus('Upcoming')
    setShowTermModal(true)
  }

  const openEditTerm = (term: AcademicTerm) => {
    setEditingTermId(term.id)
    setFormTermName(term.name)
    setFormTermStart(term.start)
    setFormTermEnd(term.end)
    setFormTermWeeks(String(term.weeks ?? 0))
    setFormTermStatus((term.status ?? '').toLowerCase() === 'closed' ? 'Closed' : 'Upcoming')
    setShowTermModal(true)
  }

  const setActiveTerm = (id: string) => {
    setActiveTermId(id)
    setTerms((prev) =>
      prev.map((t) => {
        if (t.id === id) return { ...t, status: 'Active' }
        if ((t.status ?? '').toLowerCase() === 'active') return { ...t, status: 'Closed' }
        return t
      })
    )
    toast.success('Active term updated.')
  }

  const saveTerm = () => {
    const name = formTermName.trim()
    const start = formTermStart.trim()
    const end = formTermEnd.trim()
    const weeks = Number(formTermWeeks)
    if (!name) return toast.error('Please enter a term name.')
    if (!start) return toast.error('Please enter a start date/label.')
    if (!end) return toast.error('Please enter an end date/label.')
    if (!Number.isFinite(weeks) || weeks <= 0) return toast.error('Please enter a valid number of weeks.')

    setTerms((prev) => {
      if (editingTermId) {
        return prev.map((t) => {
          if (t.id !== editingTermId) return t
          const keepActive = t.id === activeTermId || (t.status ?? '').toLowerCase() === 'active'
          return { ...t, name, start, end, weeks, status: keepActive ? 'Active' : formTermStatus, year: t.year ?? year }
        })
      }
      const id = `term-${Date.now()}`
      const first = prev.length === 0
      if (first) setActiveTermId(id)
      const next: AcademicTerm = { id, name, start, end, weeks, status: first ? 'Active' : formTermStatus, year }
      return [next, ...prev]
    })
    toast.success(editingTermId ? 'Term updated.' : 'Term added.')
    setShowTermModal(false)
  }

  const removeTerm = (id: string) => {
    setTerms((prev) => prev.filter((t) => t.id !== id))
    if (activeTermId === id) {
      const next = terms.find((t) => t.id !== id) ?? null
      setActiveTermId(next?.id ?? '')
      if (next?.id) {
        setTerms((prev) =>
          prev
            .filter((t) => t.id !== id)
            .map((t) => (t.id === next.id ? { ...t, status: 'Active' } : (t.status ?? '').toLowerCase() === 'active' ? { ...t, status: 'Upcoming' } : t))
        )
      }
    }
    toast.success('Term removed.')
  }

  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [showAllNoticesModal, setShowAllNoticesModal] = useState(false)
  const [showNoticeViewModal, setShowNoticeViewModal] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeAudience, setNoticeAudience] = useState('ALL STAFF & STUDENTS')
  const [noticeBody, setNoticeBody] = useState('')
  const [noticeHighlight, setNoticeHighlight] = useState(false)

  const selectedNotice = useMemo(() => {
    if (!selectedNoticeId) return null
    return (notices as any[]).find((n) => n?.id === selectedNoticeId) ?? null
  }, [notices, selectedNoticeId])

  const openPostNotice = () => {
    setNoticeTitle('')
    setNoticeAudience('ALL STAFF & STUDENTS')
    setNoticeBody('')
    setNoticeHighlight(false)
    setShowNoticeModal(true)
  }

  const openNoticeView = (id: string) => {
    setSelectedNoticeId(id)
    setShowNoticeViewModal(true)
  }

  const saveNotice = () => {
    const title = noticeTitle.trim()
    const audience = noticeAudience.trim()
    const body = noticeBody.trim()
    if (!title) return toast.error('Please enter a notice title.')
    if (!audience) return toast.error('Please enter an audience.')
    if (!body) return toast.error('Please enter a notice message.')
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    setNotices((prev) => [
      { id: `notice-${Date.now()}`, title, audience, body, date, highlight: noticeHighlight },
      ...prev,
    ])
    toast.success('Notice posted.')
    setShowNoticeModal(false)
  }

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">{activeTab === 'general' ? 'General Settings' : 'Class & Term Settings'}</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="page-subtitle">
            {activeTab === 'general'
              ? 'Set school information, logo, and contact details.'
              : 'Manage academic structures and broadcast institutional notices.'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {activeTab === 'class-term' ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6660' }}>Academic Year</span>
                <select value={year} onChange={e => setYear(e.target.value)} className="select text-sm py-1.5 w-40">
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="btn-outline text-sm px-3 py-1.5" onClick={openAddYear}>Add Year</button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        {activeTab === 'general' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card animate-in stagger-1 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">General Settings</h2>
                  <div className="text-sm" style={{ color: '#6B6660' }}>
                    {generalSettingsDirty ? 'You have unsaved changes.' : 'All changes saved.'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={saveGeneralSettings}
                  disabled={!generalSettingsDirty}
                  style={{ opacity: generalSettingsDirty ? 1 : 0.6, cursor: generalSettingsDirty ? 'pointer' : 'not-allowed' }}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="card animate-in stagger-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">School Profile</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">School Name</label>
                  <input
                    className="input"
                    value={generalSettings.school_name}
                    onChange={(e) => updateGeneralSettings({ school_name: e.target.value })}
                    placeholder="e.g. FlexiERP Academy"
                  />
                </div>

                <div>
                  <label className="label">School Logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onPickLogo(file)
                        e.target.value = ''
                      }}
                    />
                    <button type="button" className="btn-outline" onClick={() => logoInputRef.current?.click()}>
                      Upload Logo
                    </button>
                    {generalSettings.school_logo_data_url ? (
                      <button type="button" className="btn-outline" onClick={() => updateGeneralSettings({ school_logo_data_url: '' })}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {generalSettings.school_logo_data_url ? (
                    <div className="mt-3 rounded-xl p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                      <img
                        src={generalSettings.school_logo_data_url}
                        alt="School Logo"
                        style={{ maxHeight: 96, maxWidth: 240, objectFit: 'contain' }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="card animate-in stagger-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Contact Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="label">School&apos;s Main Address</label>
                  <input
                    className="input"
                    value={generalSettings.main_address}
                    onChange={(e) => updateGeneralSettings({ main_address: e.target.value })}
                    placeholder="e.g. 12 School Road, Lagos"
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    className="input"
                    value={generalSettings.phone_number}
                    onChange={(e) => updateGeneralSettings({ phone_number: e.target.value })}
                    placeholder="e.g. +234..."
                  />
                </div>
                <div>
                  <label className="label">General Email</label>
                  <input
                    className="input"
                    value={generalSettings.email}
                    onChange={(e) => updateGeneralSettings({ email: e.target.value })}
                    placeholder="e.g. info@school.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Website URL</label>
                  <input
                    className="input"
                    value={generalSettings.website_url}
                    onChange={(e) => updateGeneralSettings({ website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Class Directory */}
            <div className="card animate-in stagger-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Class Directory</h2>
                <button className="btn-gold text-sm px-3 py-1.5 flex items-center gap-1.5" type="button" onClick={openAddClass}>
                  <Plus size={14} /> Add Class
                </button>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Sections</th>
                    <th>Capacity</th>
                    <th>Lead Faculty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className="font-semibold">{cls.level}</td>
                      <td style={{ color: '#6B6660' }}>{cls.sections}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cls.capacity_used} / {cls.capacity_total}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6B6660' }}>{cls.lead_faculty}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100" type="button" onClick={() => openEditClass(cls)}>
                            <Pencil size={14} style={{ color: '#6B6660' }} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-50" type="button" onClick={() => removeClass(cls.id)}>
                            <Trash2 size={14} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="block mt-3 text-sm font-medium"
                style={{ color: '#C9A020' }}
                onClick={() => setShowAllClassesModal(true)}
              >
                View All Classes →
              </button>
            </div>

            {/* Academic Terms */}
            <div className="card animate-in stagger-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Academic Terms</h2>
                <div className="flex items-center gap-2">
                  <button className="btn-outline text-sm px-3 py-1.5" type="button" onClick={openTermHistory}>
                    Term History
                  </button>
                  <button className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1.5" type="button" onClick={openAddTerm}>
                    <Plus size={14} /> Add Term
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {terms.map((term) => {
                  const isActive = (term.status ?? '').toLowerCase() === 'active' || term.id === activeTermId
                  return (
                    <div key={term.id} className="rounded-xl p-4 transition-all"
                         style={{
                           border: `2px solid ${isActive ? '#C9A020' : '#E4E1D8'}`,
                           background: isActive ? 'rgba(201,160,32,0.04)' : '#F7F6F3',
                         }}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-sm">{term.name}</h3>
                        <span className="badge text-xs"
                              style={{ background: isActive ? '#ECFDF5' : '#F3F4F6',
                                       color: isActive ? '#059669' : '#4B5563' }}>
                          {isActive ? 'Active' : (term.status || 'Upcoming')}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs" style={{ color: '#6B6660' }}>
                        <p>📅 {term.start} – {term.end}</p>
                        <p>🎓 {term.weeks} Weeks</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="text-xs py-1.5 rounded-lg border transition-all hover:border-gold"
                          style={{ borderColor: '#E4E1D8', color: '#0D0D0D' }}
                          onClick={() => openEditTerm(term)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs py-1.5 rounded-lg border transition-all hover:border-gold"
                          style={{ borderColor: isActive ? 'rgba(201,160,32,0.45)' : '#E4E1D8', color: isActive ? '#C9A020' : '#0D0D0D' }}
                          onClick={() => setActiveTerm(term.id)}
                          disabled={isActive}
                        >
                          {isActive ? 'Active' : 'Set Active'}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="mt-2 w-full text-xs py-1.5 rounded-lg border transition-all hover:bg-red-50"
                        style={{ borderColor: '#FEE2E2', color: '#EF4444' }}
                        onClick={() => removeTerm(term.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notice Board */}
          <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone size={18} style={{ color: '#C9A020' }} />
                <h2 className="font-bold">Notice Board</h2>
              </div>
              <button type="button" className="btn-dark text-sm px-3 py-1.5 flex items-center gap-1.5" onClick={openPostNotice}>
                Post Notice
              </button>
            </div>
            <div className="space-y-3">
              {(notices as any[]).slice(0, 5).map((n: typeof MOCK_NOTICES[0]) => (
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
                  <p className="text-xs font-semibold tracking-wider mb-1.5"
                     style={{ color: '#C9A020' }}>{n.audience}</p>
                  <p className="text-sm" style={{ color: '#6B6660' }}>{n.body}</p>
                </button>
              ))}
            </div>
            {notices.length > 5 ? (
              <button
                type="button"
                className="block mt-4 text-sm text-center font-medium w-full"
                style={{ color: '#6B6660' }}
                onClick={() => setShowAllNoticesModal(true)}
              >
                View All Notices →
              </button>
            ) : null}
          </div>
        </div>
        )}
      </div>

      {showClassModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">{editingClassId ? 'Edit Class' : 'Add Class'}</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>Classes set here are used across the project.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowClassModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <input className="input" value={formLevel} onChange={(e) => setFormLevel(e.target.value)} placeholder="e.g. Grade 10" />
                </div>
                <div>
                  <label className="label">Sections</label>
                  <input className="input" value={formSections} onChange={(e) => setFormSections(e.target.value)} placeholder="e.g. A, B or Science, Arts" />
                </div>
                <div>
                  <label className="label">Capacity Used</label>
                  <input className="input" value={formCapUsed} onChange={(e) => setFormCapUsed(e.target.value)} />
                </div>
                <div>
                  <label className="label">Capacity Total</label>
                  <input className="input" value={formCapTotal} onChange={(e) => setFormCapTotal(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Lead Faculty</label>
                  <input className="input" value={formLead} onChange={(e) => setFormLead(e.target.value)} placeholder="e.g. Sarah Jenkins" />
                </div>
              </div>

              {uniqueLevels.length ? (
                <div className="mt-4 text-sm" style={{ color: '#6B6660' }}>
                  Current Levels: {uniqueLevels.join(', ')}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowClassModal(false)}>Cancel</button>
                <button type="button" className="btn-gold" onClick={saveClass}>{editingClassId ? 'Save Changes' : 'Add Class'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAllClassesModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-5xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">All Classes</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>These classes are used across the project.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-gold text-sm px-3 py-1.5 flex items-center gap-1.5" onClick={() => { setShowAllClassesModal(false); openAddClass() }}>
                    <Plus size={14} /> Add Class
                  </button>
                  <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowAllClassesModal(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Sections</th>
                    <th>Capacity</th>
                    <th>Lead Faculty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id}>
                      <td className="font-semibold">{cls.level}</td>
                      <td style={{ color: '#6B6660' }}>{cls.sections}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cls.capacity_used} / {cls.capacity_total}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6B6660' }}>{cls.lead_faculty}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100" type="button" onClick={() => { setShowAllClassesModal(false); openEditClass(cls) }}>
                            <Pencil size={14} style={{ color: '#6B6660' }} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-50" type="button" onClick={() => removeClass(cls.id)}>
                            <Trash2 size={14} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowAllClassesModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showYearModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">Add Academic Year</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>This is used to group terms and history.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowYearModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="label">Academic Year</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start Year</label>
                    <select className="select" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)}>
                      {yearNumberOptions.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">End Year</label>
                    <select className="select" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)}>
                      {yearNumberOptions.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowYearModal(false)}>Cancel</button>
                <button type="button" className="btn-gold" onClick={saveYear}>Save Year</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTermModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">{editingTermId ? 'Edit Term' : 'Add Term'}</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>The active term is used across the system.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowTermModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="label">Term Name</label>
                  <input className="input" value={formTermName} onChange={(e) => setFormTermName(e.target.value)} placeholder="e.g. 1st Term 2025/2026" />
                </div>
                <div>
                  <label className="label">Start</label>
                  <input className="input" value={formTermStart} onChange={(e) => setFormTermStart(e.target.value)} placeholder="e.g. Sept 1" />
                </div>
                <div>
                  <label className="label">End</label>
                  <input className="input" value={formTermEnd} onChange={(e) => setFormTermEnd(e.target.value)} placeholder="e.g. Dec 15" />
                </div>
                <div>
                  <label className="label">Weeks</label>
                  <input className="input" value={formTermWeeks} onChange={(e) => setFormTermWeeks(e.target.value)} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={formTermStatus} onChange={(e) => setFormTermStatus(e.target.value as any)}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowTermModal(false)}>Cancel</button>
                <button type="button" className="btn-gold" onClick={saveTerm}>{editingTermId ? 'Save Changes' : 'Add Term'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTermHistoryModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-4xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">Term History</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>Select an academic year and term to view stored results and finance history.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowTermHistoryModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">Academic Year</label>
                  <select className="select" value={historyYear || year} onChange={(e) => setHistoryYear(e.target.value)}>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Search Term</label>
                  <input className="input" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="e.g. 2025/2026, 1st term, closed" />
                </div>
                <div className="md:col-span-3">
                  <label className="label">Select Term</label>
                  <select className="select" value={historyTermId} onChange={(e) => setHistoryTermId(e.target.value)}>
                    <option value="">Select a term</option>
                    {filteredHistoryTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.year ? `${t.year} • ` : ''}{t.name}{t.status ? ` (${t.status})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                  <div className="font-semibold mb-1">Results</div>
                  <div className="text-sm" style={{ color: '#6B6660' }}>
                    {historySummary ? (
                      <>
                        Assessment entries: <span className="font-semibold">{historySummary.selectionCount}</span> • Student rows: <span className="font-semibold">{historySummary.studentCount}</span>
                        <br />
                        Behaviour/Skill entries: <span className="font-semibold">{historySummary.bsGroupCount}</span> • Student rows: <span className="font-semibold">{historySummary.bsStudentCount}</span>
                      </>
                    ) : (
                      'Select a term to see summary.'
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn-gold"
                      disabled={!historyTermId}
                      onClick={() => router.push(`/results?tab=view&term=${encodeURIComponent(historyTermId)}`)}
                    >
                      View Results
                    </button>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                  <div className="font-semibold mb-1">Finances</div>
                  <div className="text-sm" style={{ color: '#6B6660' }}>
                    {historySummary ? (
                      <>
                        Fee items: <span className="font-semibold">{historySummary.feeItemCount}</span> • Transactions: <span className="font-semibold">{historySummary.feeTxCount}</span>
                        <br />
                        Total collected: <span className="font-semibold">₦{historySummary.totalCollected.toLocaleString()}</span>
                      </>
                    ) : (
                      'Select a term to see summary.'
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn-gold"
                      disabled={!historyTermId}
                      onClick={() => router.push(`/fee-management?term=${encodeURIComponent(historyTermId)}`)}
                    >
                      View Finances
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowTermHistoryModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showNoticeModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">Post Notice</h3>
                  <div className="text-sm" style={{ color: '#6B6660' }}>Publish a notice to staff and students.</div>
                </div>
                <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => setShowNoticeModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="e.g. PTA Meeting Reminder" />
                </div>
                <div>
                  <label className="label">Audience</label>
                  <select className="select" value={noticeAudience} onChange={(e) => setNoticeAudience(e.target.value)}>
                    <option value="ALL STAFF & STUDENTS">All Staff & Students</option>
                    <option value="STAFF ONLY">Only Staffs</option>
                    <option value="STUDENTS ONLY">Only Students</option>
                  </select>
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea className="input" value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} rows={5} />
                </div>
                <label className="flex items-center gap-2 text-sm" style={{ color: '#6B6660' }}>
                  <input type="checkbox" checked={noticeHighlight} onChange={(e) => setNoticeHighlight(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#C9A020' }} />
                  Highlight notice
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowNoticeModal(false)}>Cancel</button>
                <button type="button" className="btn-gold" onClick={saveNotice}>Post Notice</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAllNoticesModal ? (
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
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
                {(notices as any[]).map((n: typeof MOCK_NOTICES[0]) => (
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
        <div className="fixed inset-0 z-50" style={{ background: 'rgba(13,13,13,0.55)' }}>
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
    </AppLayout>
  )
}
