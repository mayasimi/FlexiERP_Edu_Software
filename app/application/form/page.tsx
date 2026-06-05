'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload } from 'lucide-react'

const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const

type LgaMap = Record<string, string[]>
const LGA_STORAGE_KEY = 'edu_ng_states_lgas_v1'
const LGA_SOURCE_URL = '/api/ng/lgas'
const LGA_FALLBACK_URL =
  'https://gist.github.com/devhammed/0bb9eeac9ff22c895100d072f489dc98/raw/a7b19911407a89947c452339fee59f9335dc8225/nigeria-state-and-lgas.json'

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

function ApplicationFormInner() {
  const [submitting, setSubmitting] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const backTo = searchParams.get('from') || '/application'

  const [stateOfOrigin, setStateOfOrigin] = useState('')
  const [lga, setLga] = useState('')
  const [lgaMap, setLgaMap] = useState<LgaMap>({})
  const [lgaLoading, setLgaLoading] = useState(false)
  const [lgaLoadError, setLgaLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        if (typeof window === 'undefined') return
        const cached = window.localStorage.getItem(LGA_STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as LgaMap
          if (!cancelled && parsed && typeof parsed === 'object') {
            const normalized: LgaMap = {}
            for (const [k, v] of Object.entries(parsed)) {
              if (!Array.isArray(v)) continue
              normalized[normalizeKey(k)] = v
            }
            if (Object.keys(normalized).length >= 10) {
              setLgaMap(normalized)
              setLgaLoadError(false)
              return
            }
          }
        }

        setLgaLoadError(false)
        setLgaLoading(true)
        const res = await fetch(LGA_SOURCE_URL)
        const res2 = !res.ok ? await fetch(LGA_FALLBACK_URL) : null
        const finalRes = res.ok ? res : res2
        if (!finalRes || !finalRes.ok) throw new Error('Failed to fetch LGA list')
        const data = (await finalRes.json()) as Array<{ state?: string; lgas?: unknown }>
        const next: LgaMap = {}
        for (const item of data) {
          const st = (item?.state ?? '').toString().trim()
          const lgas = Array.isArray(item?.lgas) ? (item.lgas as unknown[]) : []
          if (!st) continue
          next[normalizeKey(st)] = lgas.map((x) => (x ?? '').toString().trim()).filter(Boolean)
        }

        if (Object.keys(next).length < 10) throw new Error('Invalid LGA response')
        if (!cancelled) setLgaMap(next)
        window.localStorage.setItem(LGA_STORAGE_KEY, JSON.stringify(next))
      } catch {
        if (!cancelled) {
          setLgaMap({})
          setLgaLoadError(true)
          toast.error('Could not load LGA list. Please refresh and try again.')
        }
      } finally {
        if (!cancelled) setLgaLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setLga('')
  }, [stateOfOrigin])

  const lgaOptions = useMemo(() => lgaMap[normalizeKey(stateOfOrigin)] ?? [], [lgaMap, stateOfOrigin])
  const canPickLga = Boolean(stateOfOrigin) && !lgaLoading && lgaOptions.length > 0

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      const firstName = (formData.get('firstName') ?? '').toString().trim()
      const lastName = (formData.get('lastName') ?? '').toString().trim()
      const program = (formData.get('program') ?? '').toString().trim()
      const studentName = `${firstName} ${lastName}`.trim()

      await new Promise(resolve => setTimeout(resolve, 1500))
      const now = new Date()
      const yyyy = now.getFullYear()
      const yy = String(yyyy).slice(-2)
      const seq = String(now.getTime()).slice(-4)
      const id = `APP-${yy}-${seq}`
      const dateApplied = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      const submission = {
        id,
        student_name: studentName || 'New Applicant',
        program: program || '—',
        date_applied: dateApplied,
        status: 'Pending Review',
      }

      if (typeof window !== 'undefined') {
        const storageKey = 'edu_admission_applications'
        const raw = localStorage.getItem(storageKey)
        const existing = raw ? (JSON.parse(raw) as unknown[]) : []
        const next = [submission, ...existing]
        localStorage.setItem(storageKey, JSON.stringify(next))
      }

      toast.success(`Application submitted${studentName ? ` for ${studentName}` : ''}!`)

      if (backTo.startsWith('/admission')) {
        router.push(backTo)
        return
      }

      e.currentTarget.reset()
    } catch (err) {
      toast.error('Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F6F3' }}>
      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Application Form</h1>
        <p className="page-subtitle">Complete the form below to apply for admission.</p>
      </div>

      <div className="px-6 pb-8">
        <Link href={backTo} className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform" style={{ color: '#C9A020' }}>
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="card max-w-4xl mx-auto">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input type="text" name="firstName" className="input" placeholder="e.g. John" required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" name="lastName" className="input" placeholder="e.g. Doe" required />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" name="dob" className="input" required />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select name="gender" className="select" required>
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">State of Origin</label>
                  <select name="state" className="select" required value={stateOfOrigin} onChange={(e) => setStateOfOrigin(e.target.value)}>
                    <option value="">Select State</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Local Government Area (LGA)</label>
                  <select
                    name="lga"
                    className="select"
                    required
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    disabled={!canPickLga}
                  >
                    {!stateOfOrigin ? (
                      <option value="">Select State first</option>
                    ) : lgaLoading ? (
                      <option value="">Loading LGAs…</option>
                    ) : lgaOptions.length === 0 ? (
                      <option value="">{lgaLoadError ? 'Could not load LGAs' : 'No LGAs available'}</option>
                    ) : (
                      <option value="">Select LGA</option>
                    )}
                    {lgaOptions.map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Academic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Program Applied For</label>
                  <select name="program" className="select" required>
                    <option value="">Select Program</option>
                    <option>Computer Science</option>
                    <option>Business Admin</option>
                    <option>Engineering</option>
                    <option>Literature</option>
                    <option>Architecture</option>
                  </select>
                </div>
                <div>
                  <label className="label">Level / Grade</label>
                  <select name="level" className="select" required>
                    <option value="">Select Level</option>
                    <option>JSS 1</option>
                    <option>JSS 2</option>
                    <option>JSS 3</option>
                    <option>SS 1</option>
                    <option>SS 2</option>
                    <option>SS 3</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Parent/Guardian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Parent/Guardian Full Name</label>
                  <input type="text" name="guardianName" className="input" placeholder="e.g. Jane Doe" required />
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <input type="text" name="relationship" className="input" placeholder="e.g. Mother" required />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" name="phone" className="input" placeholder="e.g. +234 800 000 0000" required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" name="email" className="input" placeholder="e.g. jane.doe@example.com" required />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                Required Documents
              </h3>
              <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors hover:bg-gray-50" style={{ borderColor: '#E4E1D8' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F7F6F3' }}>
                  <Upload size={24} style={{ color: '#C9A020' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1" style={{ color: '#6B6660' }}>Birth Certificate, Previous Result, ID Card (PDF, JPG, max 5MB)</p>
                </div>
                <input type="file" className="hidden" id="doc-upload" multiple />
                <button type="button" onClick={() => document.getElementById('doc-upload')?.click()} className="btn-outline mt-2">Browse Files</button>
              </div>
            </div>

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
    <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><p>Loading...</p></div>}>
      <ApplicationFormInner />
    </Suspense>
  )
}
