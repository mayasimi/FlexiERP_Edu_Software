'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { getClassLevelsFromDirectory, getInitials, getSectionsFromDirectory } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Download, Eye, Image as ImageIcon, Pencil, Trash2, Upload, X } from 'lucide-react'

const DEFAULT_CLASS_LEVELS = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const MOCK_STUDENTS = {
  data: [
    { id: '10001', name: 'Eleanor Vance', grade: 'Grade 12', section: 'Section A', admission_no: 'ADM-2023-001', parent: 'Mr. & Mrs. Vance', status: 'Active' },
    { id: '10002', name: 'Luke Crain', grade: 'Grade 11', section: 'Section B', admission_no: 'ADM-2023-002', parent: 'Mr. Stephen Crain', status: 'Active' },
    { id: '10003', name: 'Shirley Crain', grade: 'Grade 12', section: 'Section A', admission_no: 'ADM-2022-045', parent: 'Mr. Stephen Crain', status: 'Active' },
    { id: '10004', name: 'Theodora Crain', grade: 'Grade 10', section: 'Section A', admission_no: 'ADM-2024-012', parent: 'Mr. Stephen Crain', status: 'Active' },
    { id: '10005', name: 'Steven Crain', grade: 'Grade 9', section: 'Section B', admission_no: 'ADM-2024-089', parent: 'Mr. Stephen Crain', status: 'Inactive' },
  ],
  total: 2451, current_page: 1, last_page: 490
}

type Student = {
  id: string
  name: string
  grade: string
  section: string
  admission_no: string
  parent: string
  status: 'Active' | 'Inactive'
  avatar: string | null
  email: string
  phone: string
  blood_group: string
  genotype: string
  allergies: string
  medical_conditions: string
  medications: string
  medical_notes: string
}

const escapeCsv = (value: unknown) => {
  const raw = (value ?? '').toString()
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

const parseCsvLine = (line: string) => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

const parseCsv = (text: string) => {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).map((l) => parseCsvLine(l))
  return { headers, rows }
}

const downloadText = (filename: string, text: string, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function StudentsPage() {
  const [hasMounted, setHasMounted] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('')
  const [classLevels, setClassLevels] = useState<string[]>(DEFAULT_CLASS_LEVELS)

  const [students, setStudents] = useState<Student[]>(() =>
    MOCK_STUDENTS.data.map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      section: s.section,
      admission_no: s.admission_no,
      parent: s.parent,
      status: (s.status as Student['status']) ?? 'Active',
      avatar: null,
      email: '',
      phone: '',
      blood_group: '',
      genotype: '',
      allergies: '',
      medical_conditions: '',
      medications: '',
      medical_notes: '',
    }))
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (grade && s.grade !== grade) return false
      if (status && s.status !== status) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.admission_no.toLowerCase().includes(q) ||
        s.parent.toLowerCase().includes(q)
      )
    })
  }, [students, search, grade, status])

  const perPage = 20
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageSafe = Math.min(page, lastPage)
  const paged = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage)

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe)
  }, [page, pageSafe])

  useEffect(() => setHasMounted(true), [])

  useEffect(() => {
    if (!hasMounted) return
    setClassLevels(getClassLevelsFromDirectory(DEFAULT_CLASS_LEVELS))
  }, [hasMounted])

  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)

  const activeStudent = useMemo(() => {
    return activeStudentId ? students.find((s) => s.id === activeStudentId) ?? null : null
  }, [activeStudentId, students])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formGrade, setFormGrade] = useState('')
  const [formSection, setFormSection] = useState('')
  const [formAdmissionNo, setFormAdmissionNo] = useState('')
  const [formParent, setFormParent] = useState('')
  const [formStatus, setFormStatus] = useState<Student['status']>('Active')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAvatar, setFormAvatar] = useState<string | null>(null)
  const [formBloodGroup, setFormBloodGroup] = useState('')
  const [formGenotype, setFormGenotype] = useState('')
  const [formAllergies, setFormAllergies] = useState('')
  const [formMedicalConditions, setFormMedicalConditions] = useState('')
  const [formMedications, setFormMedications] = useState('')
  const [formMedicalNotes, setFormMedicalNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  const formSectionOptions = useMemo(() => {
    if (!hasMounted || !formGrade) return ['Section A', 'Section B', 'Section C']
    const fromDir = getSectionsFromDirectory(formGrade)
    return fromDir.length ? fromDir : ['Section A', 'Section B', 'Section C']
  }, [formGrade, hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    if (!formGrade) return
    setFormSection((prev) => (formSectionOptions.includes(prev) ? prev : ''))
  }, [formGrade, formSectionOptions, hasMounted])

  const studentCsvHeaders = useMemo(
    () => [
      'id',
      'name',
      'admission_no',
      'grade',
      'section',
      'parent',
      'status',
      'email',
      'phone',
      'blood_group',
      'genotype',
      'allergies',
      'medical_conditions',
      'medications',
      'medical_notes',
    ],
    []
  )

  const downloadStudentTemplate = () => {
    const csv = '\uFEFF' + studentCsvHeaders.map(escapeCsv).join(',') + '\n'
    downloadText('students_template.csv', csv, 'text/csv;charset=utf-8')
  }

  const importStudentsCsv = (file: File) => {
    if (file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')) {
      toast.error('Please export the Excel file as CSV and upload the .csv.')
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file (Excel-exported CSV is supported).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : ''
        const { headers, rows } = parseCsv(text)
        if (headers.length === 0) {
          toast.error('CSV is empty.')
          return
        }

        const normalizeHeader = (h: string) => h.toLowerCase().replace(/\s+/g, '_').trim()
        const headerMap = new Map(headers.map((h, idx) => [normalizeHeader(h), idx]))
        const getIdx = (key: string) => headerMap.get(key) ?? -1

        const idxId = getIdx('id')
        const idxName = getIdx('name')
        const idxAdmission = getIdx('admission_no')
        const idxGrade = getIdx('grade')
        const idxSection = getIdx('section')
        const idxParent = getIdx('parent')
        const idxStatus = getIdx('status')
        const idxEmail = getIdx('email')
        const idxPhone = getIdx('phone')
        const idxBlood = getIdx('blood_group')
        const idxGenotype = getIdx('genotype')
        const idxAllergies = getIdx('allergies')
        const idxConditions = getIdx('medical_conditions')
        const idxMedications = getIdx('medications')
        const idxNotes = getIdx('medical_notes')

        if (idxName === -1 || idxAdmission === -1 || idxGrade === -1 || idxSection === -1) {
          toast.error('CSV must include columns: name, admission_no, grade, section.')
          return
        }

        let created = 0
        let updated = 0
        let skipped = 0

        setStudents((prev) => {
          const next = [...prev]
          const byAdmission = new Map(next.map((s) => [s.admission_no.toLowerCase(), s]))

          for (const r of rows) {
            const name = (r[idxName] ?? '').trim()
            const admissionNo = (r[idxAdmission] ?? '').trim()
            const gradeValue = (r[idxGrade] ?? '').trim()
            const sectionValue = (r[idxSection] ?? '').trim()
            const parentValue = idxParent === -1 ? '' : (r[idxParent] ?? '').trim()
            const statusRaw = idxStatus === -1 ? '' : (r[idxStatus] ?? '').trim()
            const status: Student['status'] =
              statusRaw.toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
            const email = idxEmail === -1 ? '' : (r[idxEmail] ?? '').trim()
            const phone = idxPhone === -1 ? '' : (r[idxPhone] ?? '').trim()
            const blood_group = idxBlood === -1 ? '' : (r[idxBlood] ?? '').trim()
            const genotype = idxGenotype === -1 ? '' : (r[idxGenotype] ?? '').trim()
            const allergies = idxAllergies === -1 ? '' : (r[idxAllergies] ?? '').trim()
            const medical_conditions = idxConditions === -1 ? '' : (r[idxConditions] ?? '').trim()
            const medications = idxMedications === -1 ? '' : (r[idxMedications] ?? '').trim()
            const medical_notes = idxNotes === -1 ? '' : (r[idxNotes] ?? '').trim()

            if (!name || !admissionNo || !gradeValue || !sectionValue) {
              skipped += 1
              continue
            }

            const key = admissionNo.toLowerCase()
            const existing = byAdmission.get(key)

            if (existing) {
              const i = next.findIndex((s) => s.id === existing.id)
              if (i !== -1) {
                next[i] = {
                  ...existing,
                  name,
                  admission_no: admissionNo,
                  grade: gradeValue,
                  section: sectionValue,
                  parent: parentValue,
                  status,
                  email,
                  phone,
                  blood_group,
                  genotype,
                  allergies,
                  medical_conditions,
                  medications,
                  medical_notes,
                }
                byAdmission.set(key, next[i])
                updated += 1
                continue
              }
            }

            const preferredId = idxId === -1 ? '' : (r[idxId] ?? '').trim()
            const id = preferredId || `STD-${Date.now()}-${created}`
            const newStudent: Student = {
              id,
              name,
              admission_no: admissionNo,
              grade: gradeValue,
              section: sectionValue,
              parent: parentValue,
              status,
              avatar: null,
              email,
              phone,
              blood_group,
              genotype,
              allergies,
              medical_conditions,
              medications,
              medical_notes,
            }
            next.unshift(newStudent)
            byAdmission.set(key, newStudent)
            created += 1
          }

          return next
        })

        toast.success(`Import complete: ${created} added, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}.`)
      } catch {
        toast.error('Could not read this CSV file.')
      }
    }
    reader.readAsText(file)
  }

  const [showIdCards, setShowIdCards] = useState(false)
  const [cardGrade, setCardGrade] = useState<string>('')
  const [cardSection, setCardSection] = useState<string>('')
  const [cardStatus, setCardStatus] = useState<string>('Active')

  const idCardStudents = useMemo(() => {
    return students.filter((s) => {
      if (cardGrade && s.grade !== cardGrade) return false
      if (cardSection && s.section !== cardSection) return false
      if (cardStatus && s.status !== cardStatus) return false
      return true
    })
  }, [students, cardGrade, cardSection, cardStatus])

  const openIdCards = () => {
    setCardGrade(grade || 'Grade 12')
    setCardSection('')
    setCardStatus(status || 'Active')
    setShowIdCards(true)
  }

  const printIdCards = (list: Student[], title = 'student_id_cards') => {
    if (list.length === 0) {
      toast.error('No students found for this selection.')
      return
    }

    const logoUrl = `${window.location.origin}/FLEXI_LOGO.png`

    const safeText = (v: unknown) =>
      String(v ?? '').replace(/[<>&"]/g, (ch) => {
        if (ch === '<') return '&lt;'
        if (ch === '>') return '&gt;'
        if (ch === '&') return '&amp;'
        return '&quot;'
      })

    const initials = (name: string) => {
      const parts = name.trim().split(/\s+/).filter(Boolean)
      const first = parts[0]?.[0] ?? ''
      const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
      return (first + last).toUpperCase()
    }

    const cardHtml = (s: Student) => {
      const avatar = s.avatar
        ? `<img class="avatar-img" src="${safeText(s.avatar)}" alt="${safeText(s.name)}" />`
        : `<div class="avatar-fallback">${safeText(initials(s.name))}</div>`

      return `
        <div class="card">
          <div class="card-header">
            <div class="brand">
              <div class="logo">
                <img src="${safeText(logoUrl)}" alt="Logo" />
              </div>
              <div class="brand-text">
                <div class="school">Flexi Software</div>
                <div class="sub">Student ID Card</div>
              </div>
            </div>
            <div class="badge">${safeText(s.grade)}</div>
          </div>
          <div class="card-body">
            <div class="avatar">
              ${avatar}
            </div>
            <div class="info">
              <div class="name">${safeText(s.name)}</div>
              <div class="row"><span class="k">Student ID</span><span class="v">${safeText(s.id)}</span></div>
              <div class="row"><span class="k">Admission</span><span class="v">${safeText(s.admission_no)}</span></div>
              <div class="row"><span class="k">Section</span><span class="v">${safeText(s.section)}</span></div>
              <div class="row"><span class="k">Status</span><span class="v">${safeText(s.status)}</span></div>
            </div>
          </div>
        </div>
      `
    }

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeText(title)}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0D0D0D; }
          .grid { display: grid; grid-template-columns: repeat(2, 85.6mm); gap: 6mm; justify-content: center; padding: 6mm 0; }
          .card { width: 85.6mm; height: 54mm; border: 1px solid #E4E1D8; border-radius: 6mm; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
          .card-header { padding: 4mm; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(201,160,32,0.15), rgba(13,13,13,0.04)); border-bottom: 1px solid rgba(228,225,216,0.9); }
          .brand { display: flex; align-items: center; gap: 3mm; min-width: 0; }
          .logo { width: 10mm; height: 10mm; border-radius: 2mm; overflow: hidden; border: 1px solid rgba(201,160,32,0.35); background: rgba(201,160,32,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .logo img { width: 100%; height: 100%; object-fit: cover; }
          .brand-text { min-width: 0; }
          .school { font-weight: 800; font-size: 9.5pt; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sub { font-size: 7.5pt; color: #6B6660; margin-top: 0.5mm; }
          .badge { font-size: 7.5pt; font-weight: 700; color: #fff; background: #C9A020; padding: 1.2mm 2.6mm; border-radius: 999px; }
          .card-body { padding: 4mm; display: grid; grid-template-columns: 16mm 1fr; gap: 4mm; align-items: center; flex: 1; }
          .avatar { width: 16mm; height: 16mm; border-radius: 999px; overflow: hidden; border: 1px solid rgba(201,160,32,0.35); background: rgba(201,160,32,0.12); display: flex; align-items: center; justify-content: center; }
          .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 10pt; background: linear-gradient(135deg, #C9A020, #8B6E10); }
          .info { min-width: 0; }
          .name { font-weight: 800; font-size: 10pt; margin-bottom: 1.2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .row { display: flex; gap: 2mm; font-size: 7.6pt; line-height: 1.2; }
          .k { color: #6B6660; width: 17mm; flex-shrink: 0; }
          .v { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        </style>
      </head>
      <body>
        <div class="grid">
          ${list.map(cardHtml).join('\n')}
        </div>
        <script>
          window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 250); }
        </script>
      </body>
    </html>`

    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Popup blocked. Please allow popups to export PDF.')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  const openAdd = () => {
    setEditingId(null)
    setFormName('')
    setFormGrade('')
    setFormSection('')
    setFormAdmissionNo('')
    setFormParent('')
    setFormStatus('Active')
    setFormEmail('')
    setFormPhone('')
    setFormAvatar(null)
    setFormBloodGroup('')
    setFormGenotype('')
    setFormAllergies('')
    setFormMedicalConditions('')
    setFormMedications('')
    setFormMedicalNotes('')
    setShowForm(true)
  }

  const openEdit = (s: Student) => {
    setEditingId(s.id)
    setFormName(s.name)
    setFormGrade(s.grade)
    setFormSection(s.section)
    setFormAdmissionNo(s.admission_no)
    setFormParent(s.parent)
    setFormStatus(s.status)
    setFormEmail(s.email)
    setFormPhone(s.phone)
    setFormAvatar(s.avatar)
    setFormBloodGroup(s.blood_group)
    setFormGenotype(s.genotype)
    setFormAllergies(s.allergies)
    setFormMedicalConditions(s.medical_conditions)
    setFormMedications(s.medications)
    setFormMedicalNotes(s.medical_notes)
    setShowForm(true)
  }

  const pickAvatar = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 2_000_000) {
      toast.error('Image is too large. Please use an image under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : null
      setFormAvatar(value)
    }
    reader.readAsDataURL(file)
  }

  const saveStudent = () => {
    const name = formName.trim()
    const admissionNo = formAdmissionNo.trim()
    const gradeValue = formGrade.trim()
    const sectionValue = formSection.trim()
    const parentValue = formParent.trim()
    const email = formEmail.trim()
    const phone = formPhone.trim()

    if (!name || !admissionNo || !gradeValue || !sectionValue) {
      toast.error('Please fill Name, Admission No., Grade, and Section.')
      return
    }

    setStudents((prev) => {
      const admissionNoTaken = prev.some((s) => s.admission_no.toLowerCase() === admissionNo.toLowerCase() && s.id !== editingId)
      if (admissionNoTaken) {
        toast.error('Admission number already exists.')
        return prev
      }

      if (editingId) {
        return prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name,
                admission_no: admissionNo,
                grade: gradeValue,
                section: sectionValue,
                parent: parentValue,
                status: formStatus,
                email,
                phone,
                avatar: formAvatar,
                blood_group: formBloodGroup.trim(),
                genotype: formGenotype.trim(),
                allergies: formAllergies.trim(),
                medical_conditions: formMedicalConditions.trim(),
                medications: formMedications.trim(),
                medical_notes: formMedicalNotes.trim(),
              }
            : s
        )
      }

      const newStudent: Student = {
        id: `STD-${Date.now()}`,
        name,
        admission_no: admissionNo,
        grade: gradeValue,
        section: sectionValue,
        parent: parentValue,
        status: formStatus,
        email,
        phone,
        avatar: formAvatar,
        blood_group: formBloodGroup.trim(),
        genotype: formGenotype.trim(),
        allergies: formAllergies.trim(),
        medical_conditions: formMedicalConditions.trim(),
        medications: formMedications.trim(),
        medical_notes: formMedicalNotes.trim(),
      }

      return [newStudent, ...prev]
    })

    toast.success(editingId ? 'Student updated.' : 'Student added.')
    setShowForm(false)
  }

  const removeStudent = (id: string) => {
    const s = students.find((x) => x.id === id)
    if (!s) return
    if (!window.confirm(`Delete ${s.name}?`)) return
    setStudents((prev) => prev.filter((x) => x.id !== id))
    if (activeStudentId === id) {
      setActiveStudentId(null)
      setShowProfile(false)
    }
    toast.success('Student deleted.')
  }

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
            <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
                   className="input w-56" />
            <select value={grade} onChange={e => setGrade(e.target.value)} className="select w-36">
              <option value="">All Grades</option>
              {classLevels.map((g) => <option key={g}>{g}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option>
            </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={openIdCards}>
                <Download size={14} /> ID Cards (PDF)
              </button>
              <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={downloadStudentTemplate}>
                <Download size={14} /> Download Template
              </button>
              <input
                ref={csvRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importStudentsCsv(file)
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={() => csvRef.current?.click()}>
                <Upload size={14} /> Upload CSV
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
                <th>Grade / Section</th>
                <th>Parent/Guardian</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((st) => (
                <tr key={st.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {st.avatar ? (
                        <img
                          src={st.avatar}
                          alt={st.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          style={{ border: '1px solid rgba(201,160,32,0.35)' }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                             style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
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
                      <button
                        className="p-1.5 rounded hover:bg-gray-100"
                        onClick={() => {
                          setActiveStudentId(st.id)
                          setShowProfile(true)
                        }}
                      >
                        <Eye size={14} style={{ color: '#C9A020' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-100" type="button" onClick={() => printIdCards([st], `id_card_${st.id}`)}>
                        <Download size={14} style={{ color: '#C9A020' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-100" onClick={() => openEdit(st)}>
                        <Pencil size={14} style={{ color: '#6B6660' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-50" onClick={() => removeStudent(st.id)}>
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
              Showing {paged.length} of {filtered.length.toLocaleString()} students
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border" style={{ borderColor: '#E4E1D8' }}>
                <ChevronLeft size={14} />
              </button>
              {[pageSafe - 1, pageSafe, pageSafe + 1].filter(n => n > 0 && n <= lastPage).slice(0, 3).map(n => (
                <button key={n} onClick={() => setPage(n)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                        style={{ background: pageSafe === n ? '#C9A020' : 'transparent', color: pageSafe === n ? 'white' : '#0D0D0D', border: pageSafe === n ? 'none' : '1px solid #E4E1D8' }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border" style={{ borderColor: '#E4E1D8' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showProfile && activeStudent ? (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="min-h-full flex items-start justify-center px-4 py-10">
            <div className="card w-full max-w-2xl animate-in" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Student Profile</h2>
              <button onClick={() => setShowProfile(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              {activeStudent.avatar ? (
                <img src={activeStudent.avatar} alt={activeStudent.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                     style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                  {getInitials(activeStudent.name)}
                </div>
              )}
              <div>
                <div className="font-bold text-lg">{activeStudent.name}</div>
                <div className="text-sm" style={{ color: '#6B6660' }}>
                  {activeStudent.grade} / {activeStudent.section} • {activeStudent.status}
                </div>
                <div className="text-xs" style={{ color: '#A09080' }}>
                  ID: {activeStudent.id} • Admission: {activeStudent.admission_no}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Parent/Guardian</div>
                <div className="font-medium">{activeStudent.parent || '—'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Email</div>
                <div className="font-medium">{activeStudent.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Phone</div>
                <div className="font-medium">{activeStudent.phone || '—'}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B6660' }}>Medical Records</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Blood Group</div>
                  <div className="font-medium">{activeStudent.blood_group || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Genotype</div>
                  <div className="font-medium">{activeStudent.genotype || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Allergies</div>
                  <div className="font-medium whitespace-pre-wrap">{activeStudent.allergies || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Medical Conditions</div>
                  <div className="font-medium whitespace-pre-wrap">{activeStudent.medical_conditions || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Medications</div>
                  <div className="font-medium whitespace-pre-wrap">{activeStudent.medications || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Notes</div>
                  <div className="font-medium whitespace-pre-wrap">{activeStudent.medical_notes || '—'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowProfile(false)} className="btn-outline px-8">Close</button>
              <button
                onClick={() => {
                  setShowProfile(false)
                  openEdit(activeStudent)
                }}
                className="btn-gold px-10"
              >
                Edit
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {showIdCards ? (
        <div className="fixed inset-0 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 80 }}>
          <div className="min-h-full flex items-start justify-center px-4 py-6">
            <div className="card w-full max-w-5xl animate-in" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-lg">Student ID Cards</h2>
                  <p className="text-xs" style={{ color: '#6B6660' }}>Select a class and export as PDF.</p>
                </div>
                <button onClick={() => setShowIdCards(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="label">Class</label>
                  <select value={cardGrade} onChange={(e) => setCardGrade(e.target.value)} className="select">
                    {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select value={cardSection} onChange={(e) => setCardSection(e.target.value)} className="select">
                    <option value="">All</option>
                    {['Section A', 'Section B', 'Section C'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={cardStatus} onChange={(e) => setCardStatus(e.target.value)} className="select">
                    <option value="">All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn-gold w-full flex items-center justify-center gap-2" onClick={() => printIdCards(idCardStudents, `id_cards_${cardGrade || 'all'}`)}>
                    <Download size={14} /> Export PDF
                  </button>
                </div>
              </div>

              <div className="text-sm mb-3" style={{ color: '#6B6660' }}>
                {idCardStudents.length.toLocaleString()} student(s) selected
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {idCardStudents.slice(0, 12).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid #E4E1D8', background: '#fff' }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(201,160,32,0.10)', borderBottom: '1px solid #E4E1D8' }}>
                      <div className="font-bold text-sm truncate">{s.name}</div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#C9A020', color: 'white' }}>{s.grade}</span>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                      {s.avatar ? (
                        <img src={s.avatar} alt={s.name} className="w-12 h-12 rounded-full object-cover" style={{ border: '1px solid rgba(201,160,32,0.35)' }} />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                             style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                          {getInitials(s.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs" style={{ color: '#6B6660' }}>ID: <span className="font-semibold" style={{ color: '#0D0D0D' }}>{s.id}</span></div>
                        <div className="text-xs" style={{ color: '#6B6660' }}>Admission: <span className="font-semibold" style={{ color: '#0D0D0D' }}>{s.admission_no}</span></div>
                        <div className="text-xs" style={{ color: '#6B6660' }}>{s.grade} / {s.section}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {idCardStudents.length > 12 ? (
                <div className="text-xs mt-4" style={{ color: '#6B6660' }}>
                  Preview shows first 12. Export includes all selected students.
                </div>
              ) : null}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn-outline px-8" onClick={() => setShowIdCards(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="min-h-full flex items-start justify-center px-4 py-10">
            <div className="card w-full max-w-3xl animate-in flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' }}>
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-1 flex-1">
              <div className="md:col-span-1">
                <label className="label">Profile Picture</label>
                <div className="rounded-xl p-4 flex flex-col items-center gap-3" style={{ border: '1px dashed #E4E1D8', background: '#F7F6F3' }}>
                  {formAvatar ? (
                    <img src={formAvatar} alt="Profile preview" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,160,32,0.12)', color: '#C9A020' }}>
                      <ImageIcon size={28} />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) pickAvatar(file)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn-outline text-xs px-3 py-1.5" onClick={() => fileRef.current?.click()}>
                      {formAvatar ? 'Change' : 'Upload'}
                    </button>
                    {formAvatar ? (
                      <button type="button" className="btn-outline text-xs px-3 py-1.5" onClick={() => setFormAvatar(null)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Full Name</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input" placeholder="e.g. Eleanor Vance" />
                </div>
                <div>
                  <label className="label">Admission No.</label>
                  <input value={formAdmissionNo} onChange={(e) => setFormAdmissionNo(e.target.value)} className="input" placeholder="e.g. ADM-2026-001" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as Student['status'])} className="select">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="label">Grade</label>
                  <select value={formGrade} onChange={(e) => setFormGrade(e.target.value)} className="select">
                    <option value="">Select Grade</option>
                    {classLevels.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select value={formSection} onChange={(e) => setFormSection(e.target.value)} className="select">
                    <option value="">Select Section</option>
                    {formSectionOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Parent/Guardian</label>
                  <input value={formParent} onChange={(e) => setFormParent(e.target.value)} className="input" placeholder="e.g. Mr. & Mrs. Vance" />
                </div>
                <div>
                  <label className="label">Email (Optional)</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="input" placeholder="e.g. student@example.com" />
                </div>
                <div>
                  <label className="label">Phone (Optional)</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="input" placeholder="e.g. +234 801 000 0000" />
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6660' }}>Medical Records</div>
                </div>
                <div>
                  <label className="label">Blood Group (Optional)</label>
                  <select value={formBloodGroup} onChange={(e) => setFormBloodGroup(e.target.value)} className="select">
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Genotype (Optional)</label>
                  <select value={formGenotype} onChange={(e) => setFormGenotype(e.target.value)} className="select">
                    <option value="">Select</option>
                    {['AA', 'AS', 'SS', 'AC', 'SC'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Allergies (Optional)</label>
                  <textarea value={formAllergies} onChange={(e) => setFormAllergies(e.target.value)} className="input min-h-[84px]" placeholder="e.g. Peanuts, Penicillin" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Medical Conditions (Optional)</label>
                  <textarea value={formMedicalConditions} onChange={(e) => setFormMedicalConditions(e.target.value)} className="input min-h-[84px]" placeholder="e.g. Asthma" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Medications (Optional)</label>
                  <textarea value={formMedications} onChange={(e) => setFormMedications(e.target.value)} className="input min-h-[84px]" placeholder="e.g. Inhaler as needed" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Medical Notes (Optional)</label>
                  <textarea value={formMedicalNotes} onChange={(e) => setFormMedicalNotes(e.target.value)} className="input min-h-[84px]" placeholder="Any additional notes" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={saveStudent} className="btn-gold px-10">{editingId ? 'Save Changes' : 'Add Student'}</button>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}
