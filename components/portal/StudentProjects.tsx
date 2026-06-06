'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookMarked, CalendarDays, ClipboardList, UserRound, CheckCircle2, AlertCircle, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { portalApi } from '@/lib/api'
import { Card, CardLabel, GoldBadge, StatCard } from './portalUi'

const GOLD   = '#C9A020'
const BLUE   = '#3B82F6'
const GREEN  = '#10B981'
const RED    = '#EF4444'
const BORDER = '#E8E4DC'

interface Submission {
  id:               number
  note:             string | null
  file_name:        string | null
  file_url:         string | null
  file_size:        string | null
  status:           'submitted' | 'reviewed' | 'returned'
  teacher_feedback: string | null
  submitted_at:     string
}

interface Assignment {
  id:          number
  title:       string
  description: string
  subject:     string
  teacher:     string
  due_date:    string
  due_raw:     string
  status:      string
  is_overdue:  boolean
  submission:  Submission | null
}

export function StudentProjects({ studentId }: { studentId?: string }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<Record<number, HTMLInputElement | null>>({})

  const [expandedId,  setExpandedId]  = useState<number | null>(null)
  const [notes,       setNotes]       = useState<Record<number, string>>({})
  const [fileNames,   setFileNames]   = useState<Record<number, string>>({})
  const [fileObjects, setFileObjects] = useState<Record<number, File>>({})

  // ── Fetch assignments from backend ────────────────────────────────────────
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['portal-assignments', studentId],
    queryFn:  () => portalApi.getAssignments(studentId).then(r => r.data),
    enabled:  true,
  })

  // ── Submit mutation ───────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, note, file }: { assignmentId: number; note: string; file?: File }) => {
      const form = new FormData()
      if (note) form.append('note', note)
      if (file) form.append('file', file)
      if (studentId) form.append('student_id', studentId)
      return portalApi.submitAssignment(assignmentId, form)
    },
    onSuccess: (_, vars) => {
      toast.success('Assignment submitted!')
      // Clear local state for this assignment
      setNotes(prev => { const n = { ...prev }; delete n[vars.assignmentId]; return n })
      setFileNames(prev => { const n = { ...prev }; delete n[vars.assignmentId]; return n })
      setFileObjects(prev => { const n = { ...prev }; delete n[vars.assignmentId]; return n })
      setExpandedId(null)
      queryClient.invalidateQueries({ queryKey: ['portal-assignments', studentId] })
    },
    onError: () => toast.error('Failed to submit. Please try again.'),
  })

  // ── Withdraw mutation ─────────────────────────────────────────────────────
  const withdrawMutation = useMutation({
    mutationFn: (assignmentId: number) => portalApi.withdrawSubmission(assignmentId, studentId),
    onSuccess: () => {
      toast.success('Submission withdrawn.')
      queryClient.invalidateQueries({ queryKey: ['portal-assignments', studentId] })
    },
    onError: () => toast.error('Failed to withdraw submission.'),
  })

  const handleFileChange = (assignmentId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileObjects(prev => ({ ...prev, [assignmentId]: file }))
    setFileNames(prev => ({ ...prev, [assignmentId]: file.name }))
  }

  const handleSubmit = (assignmentId: number) => {
    const note = notes[assignmentId] ?? ''
    const file = fileObjects[assignmentId]
    if (!note.trim() && !file) {
      toast.error('Please add a note or attach a file before submitting.')
      return
    }
    submitMutation.mutate({ assignmentId, note, file })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Assignments/Projects</h2>
        </div>
        <Card><p style={{ color: '#9B9590' }}>Loading assignments...</p></Card>
      </div>
    )
  }

  const submitted   = assignments.filter((a: Assignment) => a.submission !== null)
  const pending     = assignments.filter((a: Assignment) => a.submission === null && !a.is_overdue)
  const overdue     = assignments.filter((a: Assignment) => a.submission === null && a.is_overdue)
  const featured    = pending[0] ?? assignments[0]

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0D0D0D', fontFamily: "'Georgia',serif", fontWeight: 400 }}>Assignments/Projects</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#5C5750' }}>Assignments from your subject teachers. Submit before the due date.</p>
      </div>

      {assignments.length === 0 ? (
        <Card><p style={{ color: '#9B9590', fontSize: 13 }}>No assignments posted yet.</p></Card>
      ) : (
        <>
          {/* Stats + Featured */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            {featured && (
              <Card style={{ background: '#0D0D0D', borderColor: '#222', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -36, top: -36, width: 130, height: 130, borderRadius: '50%', border: '28px solid rgba(201,160,32,0.15)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <p style={{ margin: 0, color: GOLD, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}>
                        {pending.length > 0 ? 'Next Due' : 'Latest Assignment'}
                      </p>
                      <h3 style={{ margin: '8px 0 0', color: '#FFFFFF', fontSize: 22, lineHeight: 1.2, fontFamily: "'Georgia',serif", fontWeight: 400 }}>{featured.title}</h3>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ClipboardList size={22} color="#0D0D0D" />
                    </div>
                  </div>
                  {featured.description && (
                    <p style={{ margin: '0 0 16px', color: '#F5F0E8', fontSize: 13, lineHeight: 1.65 }}>{featured.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <GoldBadge>{featured.subject}</GoldBadge>
                    <GoldBadge color={BLUE}>Teacher: {featured.teacher}</GoldBadge>
                    <GoldBadge color={featured.is_overdue ? RED : GREEN}>Due {featured.due_date}</GoldBadge>
                  </div>
                </div>
              </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
              <StatCard label="Total"     value={assignments.length} sub="Assigned this term"    color={GOLD}  />
              <StatCard label="Submitted" value={submitted.length}   sub="Completed"             color={GREEN} />
              <StatCard label="Pending"   value={pending.length}     sub="Awaiting submission"   color={BLUE}  />
              <StatCard label="Overdue"   value={overdue.length}     sub="Past due date"         color={overdue.length > 0 ? RED : '#9B9590'} />
            </div>
          </div>

          {/* Assignment Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
            {assignments.map((assignment: Assignment) => {
              const isExpanded   = expandedId === assignment.id
              const isSubmitted  = assignment.submission !== null
              const isOverdue    = assignment.is_overdue
              const isPending    = submitMutation.isPending && submitMutation.variables?.assignmentId === assignment.id
              const note         = notes[assignment.id] ?? ''
              const fileName     = fileNames[assignment.id] ?? ''
              const statusColor  = isSubmitted ? GREEN : isOverdue ? RED : GOLD

              return (
                <Card key={assignment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${statusColor}16`, border: `1px solid ${statusColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isSubmitted
                        ? <CheckCircle2 size={18} color={GREEN} />
                        : isOverdue
                          ? <AlertCircle size={18} color={RED} />
                          : <BookMarked size={18} color={GOLD} />
                      }
                    </div>
                    <GoldBadge color={statusColor}>
                      {isSubmitted
                        ? assignment.submission!.status === 'reviewed' ? 'Reviewed' : 'Submitted'
                        : isOverdue ? 'Overdue' : 'Pending'}
                    </GoldBadge>
                  </div>

                  <h3 style={{ margin: '0 0 8px', color: '#0D0D0D', fontSize: 17, lineHeight: 1.2, fontFamily: "'Georgia',serif", fontWeight: 400 }}>{assignment.title}</h3>
                  {assignment.description && (
                    <p style={{ margin: '0 0 12px', color: '#5C5750', fontSize: 13, lineHeight: 1.6, flex: 1 }}>{assignment.description}</p>
                  )}

                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#5C5750', fontSize: 12 }}>
                      <UserRound size={13} color={BLUE} /> {assignment.teacher} · {assignment.subject}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: isOverdue && !isSubmitted ? RED : '#5C5750', fontSize: 12, fontWeight: isOverdue && !isSubmitted ? 700 : 400 }}>
                      <CalendarDays size={13} color={isOverdue && !isSubmitted ? RED : GOLD} />
                      Due {assignment.due_date}{isOverdue && !isSubmitted ? ' — OVERDUE' : ''}
                    </span>
                  </div>

                  {/* Submitted state — show submission details */}
                  {isSubmitted && (
                    <div style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}33`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <p style={{ margin: '0 0 4px', color: GREEN, fontSize: 12, fontWeight: 800 }}>
                        ✓ Submitted {assignment.submission!.submitted_at}
                      </p>
                      {assignment.submission!.file_name && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                          <span style={{ color: '#5C5750', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📎 {assignment.submission!.file_name}
                            {assignment.submission!.file_size && (
                              <span style={{ color: '#9B9590', marginLeft: 6 }}>({assignment.submission!.file_size})</span>
                            )}
                          </span>
                          {assignment.submission!.file_url && (
                            <a href={assignment.submission!.file_url} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, color: BLUE, fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                              <Download size={12} /> View
                            </a>
                          )}
                        </div>
                      )}
                      {assignment.submission!.note && (
                        <p style={{ margin: '6px 0 0', color: '#5C5750', fontSize: 12 }}>Note: {assignment.submission!.note}</p>
                      )}
                      {assignment.submission!.teacher_feedback && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: `${BLUE}08`, borderRadius: 8, border: `1px solid ${BLUE}22` }}>
                          <p style={{ margin: 0, color: BLUE, fontSize: 11, fontWeight: 800 }}>Teacher Feedback:</p>
                          <p style={{ margin: '4px 0 0', color: '#0D0D0D', fontSize: 12 }}>{assignment.submission!.teacher_feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expand button */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                    style={{ marginTop: 'auto', border: `1px solid ${isExpanded ? BLUE : BORDER}`, background: isExpanded ? `${BLUE}0A` : '#FFFFFF', color: BLUE, borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isExpanded ? 'Hide' : isSubmitted ? 'Resubmit / Update' : 'Submit Assignment'}
                  </button>

                  {/* Submission form — expanded */}
                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: 'grid', gap: 12 }}>
                      {isSubmitted && (
                        <div style={{ background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 8, padding: 10 }}>
                          <p style={{ margin: 0, color: '#92400E', fontSize: 12 }}>You already submitted this assignment. You can update your note or replace the file.</p>
                        </div>
                      )}

                      {/* Note field */}
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ color: '#5C5750', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {isSubmitted ? 'Update Note' : 'Submission Note'}
                        </span>
                        <textarea
                          value={note}
                          onChange={e => setNotes(prev => ({ ...prev, [assignment.id]: e.target.value }))}
                          placeholder={isSubmitted ? assignment.submission!.note ?? 'Add a note...' : 'Add a short note for your teacher...'}
                          rows={3}
                          style={{ width: '100%', resize: 'vertical', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, color: '#0D0D0D', fontSize: 13, outlineColor: BLUE, fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </label>

                      {/* File upload */}
                      <div style={{ display: 'grid', gap: 5 }}>
                        <span style={{ color: '#5C5750', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {isSubmitted ? 'Replace File (optional)' : 'Attach File (optional)'}
                        </span>
                        <input
                          ref={el => { fileInputRef.current[assignment.id] = el }}
                          type="file"
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                          onChange={e => handleFileChange(assignment.id, e)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current[assignment.id]?.click()}
                          style={{ padding: '9px 12px', border: `1px dashed ${BORDER}`, borderRadius: 8, background: '#FAFAFA', color: '#5C5750', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {fileName ? `📎 ${fileName}` : '+ Choose file (PDF, Word, PowerPoint, image, ZIP — max 10MB)'}
                        </button>
                        {fileName && (
                          <button type="button" onClick={() => {
                            setFileNames(prev => { const n = { ...prev }; delete n[assignment.id]; return n })
                            setFileObjects(prev => { const n = { ...prev }; delete n[assignment.id]; return n })
                            if (fileInputRef.current[assignment.id]) fileInputRef.current[assignment.id]!.value = ''
                          }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: RED, fontSize: 11, cursor: 'pointer', padding: 0 }}>
                            <X size={12} /> Remove file
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleSubmit(assignment.id)}
                          disabled={isPending}
                          style={{ flex: 1, border: 'none', background: isPending ? '#A08018' : GOLD, color: '#0D0D0D', borderRadius: 8, padding: '11px 12px', fontSize: 13, fontWeight: 900, cursor: isPending ? 'wait' : 'pointer' }}
                        >
                          {isPending ? 'Submitting...' : isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                        </button>
                        {isSubmitted && (
                          <button
                            type="button"
                            onClick={() => withdrawMutation.mutate(assignment.id)}
                            disabled={withdrawMutation.isPending}
                            style={{ padding: '11px 14px', border: `1px solid ${RED}44`, background: `${RED}08`, color: RED, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
