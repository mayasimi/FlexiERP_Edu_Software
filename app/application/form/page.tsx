<<<<<<< HEAD
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, X, FileText, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

// ── Nigerian states ────────────────────────────────────────────────────────
const NIGERIA_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers',
  'Sokoto','Taraba','Yobe','Zamfara',
] as const

type LgaMap = Record<string, string[]>
const LGA_STORAGE_KEY  = 'edu_ng_states_lgas_v1'
const LGA_FALLBACK_URL = 'https://gist.github.com/devhammed/0bb9eeac9ff22c895100d072f489dc98/raw/a7b19911407a89947c452339fee59f9335dc8225/nigeria-state-and-lgas.json'

const normalizeKey = (v: string) =>
  v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// ── School ID from env (public, not secret) ────────────────────────────────
// In production set NEXT_PUBLIC_SCHOOL_ID in .env
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID ?? 'SCH-001'
const API_BASE  = process.env.NEXT_PUBLIC_API_URL   ?? 'http://localhost:8000/api'

interface UploadedFile { name: string; size: string; file: File }

function ApplicationFormInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const backTo        = searchParams.get('from') || '/application'
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const [submitting,     setSubmitting]     = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [applicationNo,  setApplicationNo]  = useState('')
  const [stateOfOrigin,  setStateOfOrigin]  = useState('')
  const [lga,            setLga]            = useState('')
  const [lgaMap,         setLgaMap]         = useState<LgaMap>({})
  const [lgaLoading,     setLgaLoading]     = useState(false)
  const [lgaLoadError,   setLgaLoadError]   = useState(false)
  const [uploadedFiles,  setUploadedFiles]  = useState<UploadedFile[]>([])

  // ── Load LGA data ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem(LGA_STORAGE_KEY) : null
        if (cached) {
          const parsed = JSON.parse(cached) as LgaMap
          const normalized: LgaMap = {}
          for (const [k, v] of Object.entries(parsed)) {
            if (!Array.isArray(v)) continue
            normalized[normalizeKey(k)] = v
          }
          if (Object.keys(normalized).length >= 10) {
            if (!cancelled) { setLgaMap(normalized); return }
          }
        }
        setLgaLoading(true)
        const res = await fetch(LGA_FALLBACK_URL)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json() as Array<{ state?: string; lgas?: unknown[] }>
        const next: LgaMap = {}
        for (const item of data) {
          const st = (item?.state ?? '').toString().trim()
          if (!st) continue
          next[normalizeKey(st)] = (item.lgas ?? []).map(x => String(x).trim()).filter(Boolean)
        }
        if (!cancelled) { setLgaMap(next); setLgaLoadError(false) }
        window.localStorage.setItem(LGA_STORAGE_KEY, JSON.stringify(next))
      } catch {
        if (!cancelled) { setLgaMap({}); setLgaLoadError(true) }
      } finally {
        if (!cancelled) setLgaLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { setLga('') }, [stateOfOrigin])

  const lgaOptions = useMemo(() => lgaMap[normalizeKey(stateOfOrigin)] ?? [], [lgaMap, stateOfOrigin])
  const canPickLga = Boolean(stateOfOrigin) && !lgaLoading && lgaOptions.length > 0

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const maxSize = 5 * 1024 * 1024 // 5MB
    for (const file of files) {
      if (file.size > maxSize) { toast.error(`${file.name} exceeds 5MB limit.`); continue }
      const size = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      setUploadedFiles(prev => {
        if (prev.find(f => f.name === file.name)) return prev
        return [...prev, { name: file.name, size, file }]
      })
    }
    e.target.value = ''
  }

  const removeFile = (name: string) =>
    setUploadedFiles(prev => prev.filter(f => f.name !== name))

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const fd = new FormData(e.currentTarget)

      // Override state/lga with React state (controlled selects)
      fd.set('state_of_origin', stateOfOrigin)
      fd.set('lga',             lga)
      fd.set('school_id',       SCHOOL_ID)

      // Attach files
      uploadedFiles.forEach(f => fd.append('documents[]', f.file))

      const res = await axios.post(`${API_BASE}/admissions`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const appNo = res.data.application_no
      setApplicationNo(appNo)
      setSubmitted(true)
      toast.success(`Application submitted! Reference: ${appNo}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? Object.values(err?.response?.data?.errors ?? {})[0]
        ?? 'Submission failed. Please try again.'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
        <div className="card max-w-md w-full mx-4 text-center animate-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: '#ECFDF5' }}>
            <CheckCircle2 size={32} style={{ color: '#10B981' }} />
          </div>
          <h2 className="font-bold text-xl mb-2">Application Submitted!</h2>
          <p className="text-sm mb-4" style={{ color: '#6B6660' }}>
            Your application reference number is:
          </p>
          <div className="rounded-xl px-6 py-4 mb-6 font-mono font-bold text-xl"
            style={{ background: 'rgba(201,160,32,0.1)', color: '#C9A020', border: '1px solid rgba(201,160,32,0.3)' }}>
            {applicationNo}
          </div>
          <p className="text-sm mb-6" style={{ color: '#6B6660' }}>
            Please keep this reference number. You will be contacted when your application is reviewed.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={backTo} className="btn-outline">Back to Portal</Link>
            <button onClick={() => { setSubmitted(false); setUploadedFiles([]) }} className="btn-gold">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Application Form</h1>
        <p className="page-subtitle">Complete the form below to apply for admission.</p>
      </div>

      <div className="px-6 pb-8">
        <Link href={backTo}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform"
          style={{ color: '#C9A020' }}>
          <ChevronLeft size={16} /> Back
        </Link>

        <div className="card max-w-4xl mx-auto">
          <form className="space-y-8" onSubmit={handleSubmit} encType="multipart/form-data">

            {/* ── Student Information ──────────────────────────────────── */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input type="text" name="first_name" className="input" placeholder="e.g. John" required />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input type="text" name="last_name" className="input" placeholder="e.g. Doe" required />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" name="date_of_birth" className="input" />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select name="gender" className="select">
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">State of Origin</label>
                  <select name="state_of_origin" className="select" value={stateOfOrigin}
                    onChange={e => setStateOfOrigin(e.target.value)}>
                    <option value="">Select State</option>
                    {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Local Government Area</label>
                  <select name="lga" className="select" value={lga}
                    onChange={e => setLga(e.target.value)} disabled={!canPickLga}>
                    {!stateOfOrigin
                      ? <option value="">Select State first</option>
                      : lgaLoading
                        ? <option value="">Loading LGAs…</option>
                        : <option value="">Select LGA</option>}
                    {lgaOptions.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Home Address</label>
                  <input type="text" name="address" className="input" placeholder="e.g. 12 Main Street, Lagos" />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" name="email" className="input" placeholder="student@example.com" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" name="phone" className="input" placeholder="+234 800 000 0000" />
                </div>
              </div>
            </section>

            {/* ── Academic Details ─────────────────────────────────────── */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Academic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Level / Class Applying For *</label>
                  <select name="level" className="select" required>
                    <option value="">Select Level</option>
                    <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                    <option>SSS 1</option><option>SSS 2</option><option>SSS 3</option>
                  </select>
                </div>
                <div>
                  <label className="label">Programme / Department *</label>
                  <select name="program" className="select" required>
                    <option value="">Select Programme</option>
                    <option>Science</option>
                    <option>Commercial</option>
                    <option>Arts</option>
                    <option>General Studies</option>
                    <option>Technical</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Previous School (if any)</label>
                  <input type="text" name="previous_school" className="input" placeholder="e.g. Lagos Primary School" />
                </div>
              </div>
            </section>

            {/* ── Parent / Guardian ────────────────────────────────────── */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Parent / Guardian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" name="guardian_name" className="input" placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <select name="guardian_relationship" className="select">
                    <option value="">Select</option>
                    <option>Father</option><option>Mother</option><option>Guardian</option>
                    <option>Uncle</option><option>Aunt</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" name="guardian_phone" className="input" placeholder="+234 800 000 0000" />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" name="guardian_email" className="input" placeholder="guardian@example.com" />
                </div>
                <div>
                  <label className="label">Occupation</label>
                  <input type="text" name="guardian_occupation" className="input" placeholder="e.g. Civil Servant" />
                </div>
              </div>
            </section>

            {/* ── Documents ───────────────────────────────────────────── */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Required Documents
              </h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E4E1D8' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F7F6F3' }}>
                  <Upload size={24} style={{ color: '#C9A020' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1" style={{ color: '#6B6660' }}>
                    Birth Certificate, Previous Result, Passport Photo (PDF, JPG, PNG — max 5MB each)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map(f => (
                    <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                      <FileText size={16} style={{ color: '#C9A020', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs" style={{ color: '#6B6660' }}>{f.size}</p>
                      </div>
                      <button type="button" onClick={() => removeFile(f.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50">
                        <X size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Additional Notes ─────────────────────────────────────── */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Additional Notes
              </h3>
              <textarea name="notes" className="input" rows={4}
                placeholder="Any additional information you'd like to share with the admissions team..." />
            </section>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: '#E4E1D8' }}>
              <Link href={backTo}>
                <button type="button" className="btn-outline px-8">Cancel</button>
              </Link>
              <button type="submit" disabled={submitting} className="btn-gold px-12">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationFormPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    }>
      <ApplicationFormInner />
    </Suspense>
  )
}