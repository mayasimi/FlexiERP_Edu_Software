'use client'
import { useMemo, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Users, UserCheck, UserX, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react'

const MOCK_STAFF = {
  total: 142, active: 138, on_leave: 4,
  members: [
    { id: '1', name: 'Dr. Sarah Jenkins', role: 'Head of Mathematics', department: 'Mathematics Dept.', email: 's.jenkins@edumanage.edu', status: 'Active', avatar: null },
    { id: '2', name: 'Prof. Robert Chen', role: 'Senior Lecturer', department: 'Physics Dept.', email: 'r.chen@edumanage.edu', status: 'Active', avatar: null },
    { id: '3', name: 'Elena Rostova', role: 'Academic Coordinator', department: 'Administration', email: 'e.rostova@edumanage.edu', status: 'On Leave', avatar: null },
    { id: '4', name: 'David Kim', role: 'Adjunct Professor', department: 'Humanities Dept.', email: 'd.kim@edumanage.edu', status: 'Active', avatar: null },
    { id: '5', name: 'Prof. Alan Smith', role: 'Senior Lecturer', department: 'English Dept.', email: 'a.smith@edumanage.edu', status: 'Active', avatar: null },
    { id: '6', name: 'Dr. Maria Santos', role: 'Lab Instructor', department: 'Science Dept.', email: 'm.santos@edumanage.edu', status: 'Active', avatar: null },
  ]
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#ECFDF5', text: '#059669' },
  'On Leave': { bg: '#FFF7ED', text: '#C2410C' },
}

type StaffMember = {
  id: string
  name: string
  role: string
  department: string
  email: string
  status: 'Active' | 'On Leave'
  avatar: string | null
}

export default function StaffPage() {
  const [dept, setDept] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')

  const [members, setMembers] = useState<StaffMember[]>(() =>
    MOCK_STAFF.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      department: m.department,
      email: m.email,
      status: (m.status as StaffMember['status']) ?? 'Active',
      avatar: m.avatar,
    }))
  )

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (dept && m.department !== dept) return false
      if (role && m.role !== role) return false
      if (status && m.status !== status) return false
      return true
    })
  }, [members, dept, role, status])

  const stats = useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.status === 'Active').length
    const onLeave = members.filter((m) => m.status === 'On Leave').length
    return { total, active, on_leave: onLeave }
  }, [members])

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formStatus, setFormStatus] = useState<StaffMember['status']>('Active')
  const [formAvatar, setFormAvatar] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const openAdd = () => {
    setEditingId(null)
    setFormName('')
    setFormRole('')
    setFormDepartment('')
    setFormEmail('')
    setFormStatus('Active')
    setFormAvatar(null)
    setShowModal(true)
  }

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id)
    setFormName(m.name)
    setFormRole(m.role)
    setFormDepartment(m.department)
    setFormEmail(m.email)
    setFormStatus(m.status)
    setFormAvatar(m.avatar)
    setShowModal(true)
  }

  const save = () => {
    const name = formName.trim()
    const roleValue = formRole.trim()
    const department = formDepartment.trim()
    const email = formEmail.trim()

    if (!name || !roleValue || !department) {
      toast.error('Please fill Name, Role, and Department.')
      return
    }

    setMembers((prev) => {
      if (editingId) {
        return prev.map((m) =>
          m.id === editingId
            ? { ...m, name, role: roleValue, department, email, status: formStatus, avatar: formAvatar }
            : m
        )
      }

      const newMember: StaffMember = {
        id: `staff_${Date.now()}`,
        name,
        role: roleValue,
        department,
        email,
        status: formStatus,
        avatar: formAvatar,
      }

      return [newMember, ...prev]
    })

    toast.success(editingId ? 'Staff updated.' : 'Staff added.')
    setShowModal(false)
  }

  const remove = (id: string) => {
    const m = members.find((x) => x.id === id)
    if (!m) return
    if (!window.confirm(`Delete ${m.name}?`)) return
    setMembers((prev) => prev.filter((x) => x.id !== id))
    toast.success('Staff deleted.')
  }

  const onPickAvatar = (file: File) => {
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

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Staff Member', onClick: openAdd }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Faculty Directory</h1>
        <p className="page-subtitle">Manage institutional staff, roles, and departmental assignments.</p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-in stagger-1">
          {[
            { label: 'Total Staff', value: stats.total, icon: Users, color: '#C9A020' },
            { label: 'Active Today', value: stats.active, icon: UserCheck, color: '#10B981' },
            { label: 'On Leave', value: stats.on_leave, icon: UserX, color: '#F59E0B' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="stat-label">{label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div className="stat-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end justify-between animate-in stagger-2">
          <div className="flex gap-2 flex-wrap">
            <select value={dept} onChange={e => setDept(e.target.value)} className="select w-44">
              <option value="">All Departments</option>
              <option>Mathematics Dept.</option><option>Physics Dept.</option>
              <option>Administration</option><option>Humanities Dept.</option>
            </select>
            <select value={role} onChange={e => setRole(e.target.value)} className="select w-36">
              <option value="">All Roles</option>
              <option>Head of Department</option><option>Senior Lecturer</option>
              <option>Adjunct Professor</option><option>Lab Instructor</option>
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option><option>On Leave</option>
            </select>
          </div>
        </div>

        <div className="card p-0 overflow-hidden animate-in stagger-3">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const sc = statusColors[m.status] || { bg: '#F3F4F6', text: '#4B5563' }
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            style={{ border: '1px solid rgba(201,160,32,0.35)' }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                            {getInitials(m.name)}
                          </div>
                        )}
                        <span className="font-semibold">{m.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6B6660' }}>{m.role}</td>
                    <td style={{ color: '#6B6660' }}>{m.department}</td>
                    <td style={{ color: '#6B6660' }}>{m.email}</td>
                    <td><span className="badge text-xs px-2.5 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{m.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1" onClick={() => openEdit(m)}><Pencil size={12} /> Edit</button>
                        <button className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1" style={{ borderColor: '#EF4444', color: '#EF4444' }} onClick={() => remove(m.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-2xl mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      if (file) onPickAvatar(file)
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
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input" placeholder="e.g. Dr. Sarah Jenkins" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input value={formRole} onChange={(e) => setFormRole(e.target.value)} className="input" placeholder="e.g. Senior Lecturer" />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} className="input" placeholder="e.g. Mathematics Dept." />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Email (Optional)</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="input" placeholder="e.g. s.jenkins@school.edu" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as StaffMember['status'])} className="select">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={save} className="btn-gold px-10">{editingId ? 'Save Changes' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
