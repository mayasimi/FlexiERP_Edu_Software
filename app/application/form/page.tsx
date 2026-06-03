'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload } from 'lucide-react'

function ApplicationFormInner() {
  const [submitting, setSubmitting] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const backTo = searchParams.get('from') || '/application'

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
                Guardian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Guardian Full Name</label>
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
