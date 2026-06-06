'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { getInitials } from '@/lib/utils'
import { studentApi } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  ChevronLeft, ChevronRight, Download, Eye,
  Image as ImageIcon, Pencil, Trash2, Upload, X,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Student {
  id:           string   // student_id e.g. SCH-2026-001
  db_id:        number   // internal DB id
  name:         string
  first_name:   string
  last_name:    string
  admission_no: string
  grade:        string
  section:      string
  section_id:   number | null
  parent:       string
  status:       string
  email:        string
  phone:        string
  avatar_url:   string | null
  // detail fields
  gender?:             string
  date_of_birth?:      string
  address?:            string
  parent_phone?:       string
  parent_email?:       string
  enrollment_date?:    string
  blood_group?:        string
  genotype?:           string
  allergies?:          string
  medical_conditions?: string
  medications?:        string
  medical_notes?:      string
}

interface ClassSection { id: number; name: string; full_name: string; class_name: string }

const EMPTY_FORM = {
  first_name: '', last_name: '', admission_no: '',
  class_section_id: '' as string | number,
  gender: '', date_of_birth: '',
  email: '', phone: '', address: '',
  parent_name: '', parent_phone: '', parent_email: '',
  status: 'Active',
  blood_group: '', genotype: '',
  allergies: '', medical_conditions: '', medications: '', medical_notes: '',
  avatarFile: null as File | null,
  avatarPreview: null as string | null,
}

// ── CSV helpers ────────────────────────────────────────────────────────────
const escapeCsv = (v: unknown) => {
  const raw = (v ?? '').toString()
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

const downloadText = (filename: string, text: string) => {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })),
    download: filename,
  })
  document.body.appendChild(a); a.click(); a.remove()
}

// ── ID card printer ────────────────────────────────────────────────────────
const printIdCards = (list: Student[]) => {
  if (!list.length) { toast.error('No students selected.'); return }
  const logoUrl = `${window.location.origin}/FLEXI_LOGO.png`
  const safe = (v: unknown) => String(v ?? '').replace(/[<>&"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c))

  const cardHtml = (s: Student) => {
    const avatar = s.avatar_url
      ? `<img class="avatar-img" src="${safe(s.avatar_url)}" />`
      : `<div class="avatar-fallback">${safe(getInitials(s.name))}</div>`
    return `<div class="card">
      <div class="card-header">
        <div class="brand"><div class="logo"><img src="${safe(logoUrl)}" /></div>
          <div class="brand-text"><div class="school">Flexi Software</div><div class="sub">Student ID Card</div></div></div>
        <div class="badge">${safe(s.grade)}</div>
      </div>
      <div class="card-body">
        <div class="avatar">${avatar}</div>
        <div class="info">
          <div class="name">${safe(s.name)}</div>
          <div class="row"><span class="k">Student ID</span><span class="v">${safe(s.id)}</span></div>
          <div class="row"><span class="k">Admission</span><span class="v">${safe(s.admission_no)}</span></div>
          <div class="row"><span class="k">Class</span><span class="v">${safe(s.grade)} / ${safe(s.section)}</span></div>
        </div>
      </div></div>`
  }

  const w = window.open('', '_blank')
  if (!w) { toast.error('Popup blocked — please allow popups.'); return }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}
    .grid{display:grid;grid-template-columns:repeat(2,85.6mm);gap:6mm;justify-content:center;padding:6mm 0}
    .card{width:85.6mm;height:54mm;border:1px solid #E4E1D8;border-radius:6mm;overflow:hidden;background:#fff;display:flex;flex-direction:column}
    .card-header{padding:4mm;display:flex;align-items:center;justify-content:space-between;background:rgba(201,160,32,0.12);border-bottom:1px solid #E4E1D8}
    .brand{display:flex;align-items:center;gap:3mm}.logo{width:10mm;height:10mm;border-radius:2mm;overflow:hidden}
    .logo img{width:100%;height:100%;object-fit:cover}.school{font-weight:800;font-size:9.5pt}.sub{font-size:7.5pt;color:#6B6660}
    .badge{font-size:7.5pt;font-weight:700;color:#fff;background:#C9A020;padding:1.2mm 2.6mm;border-radius:999px}
    .card-body{padding:4mm;display:grid;grid-template-columns:16mm 1fr;gap:4mm;align-items:center;flex:1}
    .avatar{width:16mm;height:16mm;border-radius:999px;overflow:hidden;border:1px solid rgba(201,160,32,0.35);display:flex;align-items:center;justify-content:center}
    .avatar-img{width:100%;height:100%;object-fit:cover}.avatar-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:10pt;background:linear-gradient(135deg,#C9A020,#8B6E10)}
    .name{font-weight:800;font-size:10pt;margin-bottom:1.2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .row{display:flex;gap:2mm;font-size:7.6pt}.k{color:#6B6660;width:17mm;flex-shrink:0}.v{font-weight:700}
  </style></head><body><div class="grid">${list.map(cardHtml).join('')}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`)
  w.document.close()
}

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)
  const csvRef      = useRef<HTMLInputElement>(null)

  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [grade,   setGrade]   = useState('')
  const [status,  setStatus]  = useState('')

  const [showForm,    setShowForm]    = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showIdCards, setShowIdCards] = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [viewingId,   setViewingId]   = useState<number | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [cardGrade,   setCardGrade]   = useState('')
  const [cardSection, setCardSection] = useState('')
  const [cardStatus,  setCardStatus]  = useState('Active')

  useEffect(() => { setPage(1) }, [search, grade, status])

  // ── Fetch students ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, grade, status],
    queryFn:  () => studentApi.list({ page, search: search || undefined, grade: grade || undefined, status: status || undefined, per_page: 20 }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  })

  const students: Student[]  = data?.data        ?? []
  const totalStudents        = data?.total        ?? 0
  const lastPage             = data?.last_page    ?? 1

  // ── Fetch class sections for dropdowns ────────────────────────────────────
  const { data: sections = [] } = useQuery<ClassSection[]>({
    queryKey: ['student-class-sections'],
    queryFn:  () => studentApi.classSections().then(r => r.data),
  })

  const uniqueClasses = [...new Set(sections.map(s => s.class_name))].sort()
  const sectionsForClass = (className: string) => sections.filter(s => s.class_name === className)

  // ── Fetch full detail for profile modal ───────────────────────────────────
  const { data: profileData } = useQuery({
    queryKey: ['student-detail', viewingId],
    queryFn:  () => studentApi.show(String(viewingId!)).then(r => r.data.data),
    enabled:  viewingId !== null,
  })
  const activeStudent: Student | undefined = profileData

  // ── ID card students (from current page data, filtered) ───────────────────
  const idCardStudents = useMemo(() =>
    students.filter(s => {
      if (cardGrade   && s.grade   !== cardGrade)   return false
      if (cardSection && s.section !== cardSection) return false
      if (cardStatus  && s.status  !== cardStatus)  return false
      return true
    }), [students, cardGrade, cardSection, cardStatus])

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (fd: FormData) => studentApi.create(fd),
    onSuccess:  () => { toast.success('Student added!'); closeForm(); queryClient.invalidateQueries({ queryKey: ['students'] }) },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add student.'),
  })

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: number; fd: FormData }) => studentApi.update(String(id), fd),
    onSuccess:  () => { toast.success('Student updated!'); closeForm(); queryClient.invalidateQueries({ queryKey: ['students'] }); queryClient.invalidateQueries({ queryKey: ['student-detail'] }) },
    onError:    (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update student.'),
  })

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentApi.destroy(String(id)),
    onSuccess:  () => { toast.success('Student deleted.'); queryClient.invalidateQueries({ queryKey: ['students'] }) },
    onError:    () => toast.error('Failed to delete student.'),
  })

  // ── Bulk import mutation ──────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: (fd: FormData) => studentApi.bulkImport(fd),
    onSuccess:  (res: any) => {
      const d = res.data
      toast.success(d.message)
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Import failed.'),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }

  const openAdd = () => {
    setEditingId(null); setForm(EMPTY_FORM); setShowForm(true)
  }

  const openEdit = (s: Student) => {
    setEditingId(s.db_id)
    const sectionObj = sections.find(x => x.id === s.section_id)
    setForm({
      first_name:         s.first_name,
      last_name:          s.last_name,
      admission_no:       s.admission_no,
      class_section_id:   s.section_id ?? '',
      gender:             s.gender ?? '',
      date_of_birth:      '',
      email:              s.email ?? '',
      phone:              s.phone ?? '',
      address:            s.address ?? '',
      parent_name:        s.parent ?? '',
      parent_phone:       s.parent_phone ?? '',
      parent_email:       s.parent_email ?? '',
      status:             s.status,
      blood_group:        s.blood_group ?? '',
      genotype:           s.genotype ?? '',
      allergies:          s.allergies ?? '',
      medical_conditions: s.medical_conditions ?? '',
      medications:        s.medications ?? '',
      medical_notes:      s.medical_notes ?? '',
      avatarFile:         null,
      avatarPreview:      s.avatar_url,
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.admission_no.trim()) {
      toast.error('First name, last name and admission number are required.'); return
    }
    const fd = new FormData()
    fd.append('first_name',   form.first_name.trim())
    fd.append('last_name',    form.last_name.trim())
    fd.append('admission_no', form.admission_no.trim())
    if (form.class_section_id) fd.append('class_section_id', String(form.class_section_id))
    if (form.gender)         fd.append('gender',          form.gender)
    if (form.date_of_birth)  fd.append('date_of_birth',   form.date_of_birth)
    if (form.email)          fd.append('email',           form.email.trim())
    if (form.phone)          fd.append('phone',           form.phone.trim())
    if (form.address)        fd.append('address',         form.address.trim())
    if (form.parent_name)    fd.append('parent_name',     form.parent_name.trim())
    if (form.parent_phone)   fd.append('parent_phone',    form.parent_phone.trim())
    if (form.parent_email)   fd.append('parent_email',    form.parent_email.trim())
    fd.append('status',      form.status)
    if (form.blood_group)        fd.append('blood_group',        form.blood_group)
    if (form.genotype)           fd.append('genotype',           form.genotype)
    if (form.allergies)          fd.append('allergies',          form.allergies)
    if (form.medical_conditions) fd.append('medical_conditions', form.medical_conditions)
    if (form.medications)        fd.append('medications',        form.medications)
    if (form.medical_notes)      fd.append('medical_notes',      form.medical_notes)
    if (form.avatarFile)         fd.append('avatar',             form.avatarFile)

    if (editingId) { updateMutation.mutate({ id: editingId, fd }) }
    else           { createMutation.mutate(fd) }
  }

  const handleDelete = (s: Student) => {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return
    deleteMutation.mutate(s.db_id)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/'))  { toast.error('Please select an image.'); return }
    if (file.size > 2_000_000)            { toast.error('Image must be under 2MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({
      ...f, avatarFile: file,
      avatarPreview: typeof reader.result === 'string' ? reader.result : null,
    }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCsvUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file.'); return
    }
    const fd = new FormData()
    fd.append('file', file)
    importMutation.mutate(fd)
  }

  const downloadTemplate = () => {
    const headers = [
      'first_name','last_name','admission_no','grade','section',
      'parent','email','phone','status',
      'blood_group','genotype','allergies','medical_conditions','medications','medical_notes',
    ]
    downloadText('students_template.csv', '\uFEFF' + headers.map(escapeCsv).join(',') + '\n')
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Selected class for form (for section sub-dropdown) ────────────────────
  const selectedClass = sections.find(s => s.id === Number(form.class_section_id))?.class_name ?? ''

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Student', onClick: openAdd }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Student Information System</h1>
        <p className="page-subtitle">Manage student records, personal details, and academic history.</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Filters */}
        <div className="card animate-in stagger-1">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <input placeholder="Search students…" value={search}
                onChange={e => setSearch(e.target.value)} className="input w-56" />
              <select value={grade} onChange={e => setGrade(e.target.value)} className="select w-40">
                <option value="">All Classes</option>
                {uniqueClasses.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={status} onChange={e => setStatus(e.target.value)} className="select w-36">
                <option value="">All Status</option>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline text-sm flex items-center gap-2" onClick={() => setShowIdCards(true)}>
                <Download size={14} /> ID Cards
              </button>
              <button className="btn-outline text-sm flex items-center gap-2" onClick={downloadTemplate}>
                <Download size={14} /> Template
              </button>
              <input ref={csvRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = '' }} />
              <button className="btn-outline text-sm flex items-center gap-2"
                onClick={() => csvRef.current?.click()}
                disabled={importMutation.isPending}>
                <Upload size={14} /> {importMutation.isPending ? 'Importing…' : 'Upload CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden animate-in stagger-2">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No.</th>
                <th>Class / Section</th>
                <th>Parent/Guardian</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading...</td></tr>
              )}
              {!isLoading && students.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>No students found.</td></tr>
              )}
              {students.map(st => (
                <tr key={st.db_id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {st.avatar_url ? (
                        <img src={st.avatar_url} alt={st.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          style={{ border: '1px solid rgba(201,160,32,0.35)' }} />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#C9A020,#8B6E10)' }}>
                          {getInitials(st.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{st.name}</p>
                        <p className="text-xs" style={{ color: '#A09080' }}>ID: {st.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{st.admission_no}</td>
                  <td style={{ color: '#6B6660' }}>{st.grade} / {st.section}</td>
                  <td style={{ color: '#6B6660' }}>{st.parent}</td>
                  <td>
                    <span className={`badge ${st.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                      {st.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded hover:bg-gray-100"
                        onClick={() => { setViewingId(st.db_id); setShowProfile(true) }}>
                        <Eye size={14} style={{ color: '#C9A020' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-100"
                        onClick={() => printIdCards([st])}>
                        <Download size={14} style={{ color: '#C9A020' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-100" onClick={() => openEdit(st)}>
                        <Pencil size={14} style={{ color: '#6B6660' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-50" onClick={() => handleDelete(st)}>
                        <Trash2 size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: '#E4E1D8' }}>
            <span className="text-sm" style={{ color: '#6B6660' }}>
              {totalStudents > 0 ? `Page ${page} of ${lastPage} · ${totalStudents.toLocaleString()} students` : 'No entries'}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border disabled:opacity-30"
                style={{ borderColor: '#E4E1D8' }}>
                <ChevronLeft size={14} />
              </button>
              {[page - 1, page, page + 1].filter(n => n >= 1 && n <= lastPage).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium"
                  style={{ background: page === n ? '#C9A020' : 'transparent', color: page === n ? 'white' : '#0D0D0D', border: page === n ? 'none' : '1px solid #E4E1D8' }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
                className="w-8 h-8 flex items-center justify-center rounded-lg border disabled:opacity-30"
                style={{ borderColor: '#E4E1D8' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile Modal ──────────────────────────────────────────────────── */}
      {showProfile && activeStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="min-h-full flex items-start justify-center px-4 py-10">
            <div className="card w-full max-w-2xl animate-in" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Student Profile</h2>
                <button onClick={() => setShowProfile(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                {activeStudent.avatar_url ? (
                  <img src={activeStudent.avatar_url} alt={activeStudent.name}
                    className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#C9A020,#8B6E10)' }}>
                    {getInitials(activeStudent.name)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{activeStudent.name}</div>
                  <div className="text-sm" style={{ color: '#6B6660' }}>
                    {activeStudent.grade} / {activeStudent.section} · {activeStudent.status}
                  </div>
                  <div className="text-xs" style={{ color: '#A09080' }}>
                    ID: {activeStudent.id} · Admission: {activeStudent.admission_no}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Parent/Guardian', value: activeStudent.parent },
                  { label: 'Email',           value: activeStudent.email },
                  { label: 'Phone',           value: activeStudent.phone },
                  { label: 'Parent Phone',    value: activeStudent.parent_phone },
                  { label: 'Parent Email',    value: activeStudent.parent_email },
                  { label: 'Gender',          value: activeStudent.gender },
                  { label: 'Date of Birth',   value: activeStudent.date_of_birth },
                  { label: 'Enrolled',        value: activeStudent.enrollment_date },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B6660' }}>{label}</div>
                    <div className="font-medium">{value || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B6660' }}>Medical Records</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Blood Group', value: activeStudent.blood_group },
                    { label: 'Genotype',    value: activeStudent.genotype },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B6660' }}>{label}</div>
                      <div className="font-medium">{value || '—'}</div>
                    </div>
                  ))}
                  {[
                    { label: 'Allergies',          value: activeStudent.allergies },
                    { label: 'Medical Conditions', value: activeStudent.medical_conditions },
                    { label: 'Medications',        value: activeStudent.medications },
                    { label: 'Medical Notes',      value: activeStudent.medical_notes },
                  ].map(({ label, value }) => (
                    <div key={label} className="md:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B6660' }}>{label}</div>
                      <div className="font-medium whitespace-pre-wrap">{value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowProfile(false)} className="btn-outline px-8">Close</button>
                <button onClick={() => { setShowProfile(false); openEdit(activeStudent) }} className="btn-gold px-10">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ID Cards Modal ─────────────────────────────────────────────────── */}
      {showIdCards && (
        <div className="fixed inset-0 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 80 }}>
          <div className="min-h-full flex items-start justify-center px-4 py-6">
            <div className="card w-full max-w-3xl animate-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Student ID Cards</h2>
                <button onClick={() => setShowIdCards(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="label">Class</label>
                  <select value={cardGrade} onChange={e => setCardGrade(e.target.value)} className="select">
                    <option value="">All</option>
                    {uniqueClasses.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select value={cardSection} onChange={e => setCardSection(e.target.value)} className="select">
                    <option value="">All</option>
                    {sections.filter(s => !cardGrade || s.class_name === cardGrade).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={cardStatus} onChange={e => setCardStatus(e.target.value)} className="select">
                    <option value="">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button className="btn-gold w-full flex items-center justify-center gap-2"
                    onClick={() => printIdCards(idCardStudents)}>
                    <Download size={14} /> Export PDF
                  </button>
                </div>
              </div>
              <p className="text-sm mb-3" style={{ color: '#6B6660' }}>
                {idCardStudents.length} student(s) from current page match this filter.
                For all students, search with no filters first.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {idCardStudents.slice(0, 12).map(s => (
                  <div key={s.db_id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E4E1D8' }}>
                    <div className="px-3 py-2 flex items-center justify-between"
                      style={{ background: 'rgba(201,160,32,0.10)', borderBottom: '1px solid #E4E1D8' }}>
                      <span className="font-bold text-sm truncate">{s.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#C9A020', color: 'white' }}>{s.grade}</span>
                    </div>
                    <div className="p-3 flex items-center gap-3">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#C9A020,#8B6E10)' }}>
                          {getInitials(s.name)}
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <div style={{ color: '#6B6660' }}>ID: <strong style={{ color: '#0D0D0D' }}>{s.id}</strong></div>
                        <div style={{ color: '#6B6660' }}>{s.grade} / {s.section}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="min-h-full flex items-start justify-center px-4 py-10">
            <div className="card w-full max-w-3xl animate-in flex flex-col"
              style={{ maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' }}>
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h2 className="font-bold text-lg">{editingId ? 'Edit Student' : 'Add Student'}</h2>
                <button onClick={closeForm}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1 flex-1">
                {/* Avatar */}
                <div className="md:col-span-1">
                  <label className="label">Profile Picture</label>
                  <div className="rounded-xl p-4 flex flex-col items-center gap-3"
                    style={{ border: '1px dashed #E4E1D8', background: '#F7F6F3' }}>
                    {form.avatarPreview ? (
                      <img src={form.avatarPreview} className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(201,160,32,0.12)', color: '#C9A020' }}>
                        <ImageIcon size={28} />
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={handleAvatarChange} />
                    <div className="flex gap-2">
                      <button type="button" className="btn-outline text-xs px-3 py-1.5"
                        onClick={() => fileRef.current?.click()}>
                        {form.avatarPreview ? 'Change' : 'Upload'}
                      </button>
                      {form.avatarPreview && (
                        <button type="button" className="btn-outline text-xs px-3 py-1.5"
                          onClick={() => setForm(f => ({ ...f, avatarFile: null, avatarPreview: null }))}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name *</label>
                    <input value={form.first_name}
                      onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                      className="input" placeholder="e.g. Kehinde" />
                  </div>
                  <div>
                    <label className="label">Last Name *</label>
                    <input value={form.last_name}
                      onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                      className="input" placeholder="e.g. Adeleke" />
                  </div>
                  <div>
                    <label className="label">Admission No. *</label>
                    <input value={form.admission_no}
                      onChange={e => setForm(f => ({ ...f, admission_no: e.target.value }))}
                      className="input" placeholder="e.g. ADM-2026-001" />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="select">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Class</label>
                    <select
                      value={sections.find(s => s.id === Number(form.class_section_id))?.class_name ?? ''}
                      onChange={e => {
                        // When class changes, reset section selection
                        const firstSection = sections.find(s => s.class_name === e.target.value)
                        setForm(f => ({ ...f, class_section_id: firstSection?.id ?? '' }))
                      }} className="select">
                      <option value="">Select Class</option>
                      {uniqueClasses.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Section</label>
                    <select value={form.class_section_id}
                      onChange={e => setForm(f => ({ ...f, class_section_id: e.target.value }))}
                      className="select">
                      <option value="">Select Section</option>
                      {sections
                        .filter(s => !selectedClass || s.class_name === selectedClass)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="select">
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input type="date" value={form.date_of_birth}
                      onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                      className="input" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Parent/Guardian Name</label>
                    <input value={form.parent_name}
                      onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                      className="input" placeholder="e.g. Mr. & Mrs. Adeleke" />
                  </div>
                  <div>
                    <label className="label">Parent Phone</label>
                    <input value={form.parent_phone}
                      onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                      className="input" placeholder="+234 800 000 0000" />
                  </div>
                  <div>
                    <label className="label">Parent Email</label>
                    <input type="email" value={form.parent_email}
                      onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
                      className="input" placeholder="parent@example.com" />
                  </div>
                  <div>
                    <label className="label">Student Email</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input" placeholder="student@example.com" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="input" placeholder="+234 800 000 0000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Address</label>
                    <input value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="input" placeholder="Home address" />
                  </div>

                  {/* Medical */}
                  <div className="md:col-span-2 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6660' }}>Medical Records</div>
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select value={form.blood_group}
                      onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} className="select">
                      <option value="">Select</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Genotype</label>
                    <select value={form.genotype}
                      onChange={e => setForm(f => ({ ...f, genotype: e.target.value }))} className="select">
                      <option value="">Select</option>
                      {['AA','AS','SS','AC','SC'].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  {[
                    { label: 'Allergies',           field: 'allergies'          as const },
                    { label: 'Medical Conditions',  field: 'medical_conditions' as const },
                    { label: 'Medications',         field: 'medications'        as const },
                    { label: 'Medical Notes',       field: 'medical_notes'      as const },
                  ].map(({ label, field }) => (
                    <div key={field} className="md:col-span-2">
                      <label className="label">{label}</label>
                      <textarea value={form[field] as string}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="input min-h-[72px]" placeholder={`Enter ${label.toLowerCase()}...`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                <button onClick={closeForm} className="btn-outline px-8">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="btn-gold px-10">
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
