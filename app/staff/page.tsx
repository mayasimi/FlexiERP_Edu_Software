'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { staffApi } from '@/lib/api'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Users, UserCheck, UserX, LayoutGrid, List,
  Eye, Pencil, Trash2, X, Image as ImageIcon, Save,
} from 'lucide-react'

const statusColors: Record<string, { bg: string; text: string }> = {
  Active:     { bg: '#ECFDF5', text: '#059669' },
  Inactive:   { bg: '#FEF2F2', text: '#991B1B' },
  'On Leave': { bg: '#FFF7ED', text: '#C2410C' },
}

interface StaffMember {
  id:         string
  staff_id:   string
  name:       string
  first_name: string
  last_name:  string
  role:       string
  department: string
  email:      string
  phone:      string
  status:     string
  avatar_url: string | null
}

const EMPTY_FORM = {
  first_name:  '',
  last_name:   '',
  role:        '',
  department:  '',
  email:       '',
  phone:       '',
  status:      'Active',
  avatarFile:  null as File | null,
  avatarPreview: null as string | null,
}

export default function StaffPage() {
  const queryClient = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [search,   setSearch]   = useState('')
  const [dept,     setDept]     = useState('')
  const [status,   setStatus]   = useState('')

  const [showModal,  setShowModal]  = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [viewingId,  setViewingId]  = useState<string | null>(null)
  const [form,       setForm]       = useState(EMPTY_FORM)

  // ── Fetch staff ────────────────────────────────────────────────────────────
  const { data = { data: [], total: 0 } } = useQuery({
    queryKey: ['staff', search, dept, status],
    queryFn:  () => staffApi.list({ search, department: dept, status, per_page: 100 }).then(r => r.data),
  })

  const members: StaffMember[] = (data.data ?? []).map((m: any) => ({
    id:         String(m.id),
    staff_id:   m.staff_id ?? '',
    name:       m.name ?? (m.first_name + ' ' + m.last_name),
    first_name: m.first_name,
    last_name:  m.last_name,
    role:       m.role ?? m.role_title ?? '—',
    department: m.department ?? m.department_name ?? '—',
    email:      m.email ?? '—',
    phone:      m.phone ?? '—',
    status:     m.status ?? 'Active',
    avatar_url: m.avatar_url ?? null,
  }))

  const totalStaff = data.total ?? members.length
  const active     = members.filter(m => m.status === 'Active').length
  const onLeave    = members.filter(m => m.status === 'On Leave').length

  // ── Create mutation ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (fd: FormData) => staffApi.create(fd),
    onSuccess:  () => { toast.success('Staff member added.'); closeModal(); queryClient.invalidateQueries({ queryKey: ['staff'] }) },
    onError:    () => toast.error('Failed to add staff member.'),
  })

  // ── Update mutation ────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => staffApi.update(id, fd),
    onSuccess:  () => { toast.success('Staff updated.'); closeModal(); queryClient.invalidateQueries({ queryKey: ['staff'] }) },
    onError:    () => toast.error('Failed to update staff.'),
  })

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.destroy(id),
    onSuccess:  () => { toast.success('Staff deleted.'); queryClient.invalidateQueries({ queryKey: ['staff'] }) },
    onError:    () => toast.error('Failed to delete.'),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM) }

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id)
    setForm({
      first_name: m.first_name,
      last_name:  m.last_name,
      role:       m.role,
      department: m.department,
      email:      m.email,
      phone:      m.phone,
      status:     m.status,
      avatarFile:    null,
      avatarPreview: m.avatar_url,
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First name and last name are required.'); return
    }
    const fd = new FormData()
    fd.append('first_name',  form.first_name.trim())
    fd.append('last_name',   form.last_name.trim())
    fd.append('role',        form.role.trim())
    fd.append('department',  form.department.trim())
    fd.append('email',       form.email.trim())
    fd.append('phone',       form.phone.trim())
    fd.append('status',      form.status)
    if (form.avatarFile) fd.append('avatar', form.avatarFile)

    if (editingId) {
      updateMutation.mutate({ id: editingId, fd })
    } else {
      createMutation.mutate(fd)
    }
  }

  const handleDelete = (m: StaffMember) => {
    if (!confirm(`Delete ${m.name}? This cannot be undone.`)) return
    deleteMutation.mutate(m.id)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/'))    { toast.error('Please select an image.'); return }
    if (file.size > 2_000_000)              { toast.error('Image must be under 2MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({
      ...f,
      avatarFile:    file,
      avatarPreview: typeof reader.result === 'string' ? reader.result : null,
    }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const viewedMember = members.find(m => m.id === viewingId)
  const isSaving = createMutation.isPending || updateMutation.isPending

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
            { label: 'Total Staff',  value: totalStaff, icon: Users,      color: '#C9A020' },
            { label: 'Active Today', value: active,     icon: UserCheck,  color: '#10B981' },
            { label: 'On Leave',     value: onLeave,    icon: UserX,      color: '#F59E0B' },
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

        {/* Filters + View Toggle */}
        <div className="flex flex-wrap gap-3 items-end justify-between animate-in stagger-2">
          <div className="flex gap-2 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff..." className="input w-48" />
            <select value={dept} onChange={e => setDept(e.target.value)} className="select w-44">
              <option value="">All Departments</option>
              <option>Mathematics</option><option>Physics</option><option>Chemistry</option>
              <option>Biology</option><option>English</option><option>Administration</option>
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option><option>On Leave</option>
            </select>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
            <button onClick={() => setViewMode('grid')} className="p-2 rounded-md transition-all"
              style={{ background: viewMode === 'grid' ? 'white' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <LayoutGrid size={16} style={{ color: viewMode === 'grid' ? '#C9A020' : '#6B6660' }} />
            </button>
            <button onClick={() => setViewMode('list')} className="p-2 rounded-md transition-all"
              style={{ background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <List size={16} style={{ color: viewMode === 'list' ? '#C9A020' : '#6B6660' }} />
            </button>
          </div>
        </div>

        {members.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>No staff records found.</p>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in stagger-3">
            {members.map(m => {
              const sc = statusColors[m.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
              return (
                <div key={m.id} className="card-hover">
                  <div className="flex justify-end mb-3">
                    <span className="badge text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.text }}>{m.status}</span>
                  </div>
                  <div className="flex flex-col items-center text-center mb-4">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name}
                        className="w-16 h-16 rounded-full object-cover mb-3"
                        style={{ border: '2px solid rgba(201,160,32,0.3)' }} />
                    ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
                        style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                        {getInitials(m.name)}
                      </div>
                    )}
                    <h3 className="font-bold text-base">{m.name}</h3>
                    <p className="text-sm font-medium" style={{ color: '#C9A020' }}>{m.role}</p>
                  </div>
                  <div className="space-y-1.5 mb-4 text-sm">
                    <div className="flex items-center gap-2 truncate" style={{ color: '#6B6660' }}>
                      🏛 {m.department}
                    </div>
                    <div className="flex items-center gap-2 truncate" style={{ color: '#6B6660' }}>
                      ✉ {m.email}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewingId(m.id)}
                      className="flex-1 btn-outline text-xs py-1.5 flex items-center justify-center gap-1">
                      <Eye size={13} /> View
                    </button>
                    <button onClick={() => openEdit(m)} className="btn-outline px-3 py-1.5 text-xs">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(m)}
                      className="btn-outline px-3 py-1.5 text-xs" style={{ color: '#EF4444', borderColor: '#EF4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
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
                {members.map(m => {
                  const sc = statusColors[m.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.name}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              style={{ border: '1px solid rgba(201,160,32,0.35)' }} />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                              {getInitials(m.name)}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold">{m.name}</span>
                            <p className="text-xs" style={{ color: '#6B6660' }}>{m.staff_id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#6B6660' }}>{m.role}</td>
                      <td style={{ color: '#6B6660' }}>{m.department}</td>
                      <td style={{ color: '#6B6660' }}>{m.email}</td>
                      <td>
                        <span className="badge text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}>{m.status}</span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingId(m.id)}
                            className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1">
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => openEdit(m)}
                            className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(m)}
                            className="btn-outline text-xs px-2.5 py-1.5"
                            style={{ color: '#EF4444', borderColor: '#EF4444' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-2xl mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Avatar */}
              <div>
                <label className="label">Profile Picture</label>
                <div className="rounded-xl p-4 flex flex-col items-center gap-3"
                  style={{ border: '1px dashed #E4E1D8', background: '#F7F6F3' }}>
                  {form.avatarPreview ? (
                    <img src={form.avatarPreview} alt="Preview"
                      className="w-24 h-24 rounded-full object-cover" />
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
                  <p className="text-xs text-center" style={{ color: '#6B6660' }}>
                    JPG, PNG — max 2MB
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="input" placeholder="e.g. Emeka" />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="input" placeholder="e.g. Okafor" />
                </div>
                <div>
                  <label className="label">Role / Title</label>
                  <input value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="input" placeholder="e.g. Physics Teacher" />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="input" placeholder="e.g. Science Dept." />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input" placeholder="e.g. e.okafor@school.edu" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input" placeholder="+234 800 000 0000" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="select">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="btn-outline px-8">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-gold px-10">
                <Save size={14} />
                {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ─────────────────────────────────────────────── */}
      {viewingId && viewedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Staff Details</h2>
              <button onClick={() => setViewingId(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center text-center mb-6">
              {viewedMember.avatar_url ? (
                <img src={viewedMember.avatar_url} alt={viewedMember.name}
                  className="w-20 h-20 rounded-full object-cover mb-3"
                  style={{ border: '2px solid rgba(201,160,32,0.3)' }} />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
                  style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                  {getInitials(viewedMember.name)}
                </div>
              )}
              <h3 className="font-bold text-xl">{viewedMember.name}</h3>
              <p className="font-medium" style={{ color: '#C9A020' }}>{viewedMember.role}</p>
              <span className="mt-2 badge text-xs px-3 py-1 rounded-full"
                style={{ background: statusColors[viewedMember.status]?.bg ?? '#F3F4F6', color: statusColors[viewedMember.status]?.text ?? '#4B5563' }}>
                {viewedMember.status}
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Staff ID',    value: viewedMember.staff_id },
                { label: 'Department',  value: viewedMember.department },
                { label: 'Email',       value: viewedMember.email },
                { label: 'Phone',       value: viewedMember.phone },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor: '#E4E1D8' }}>
                  <span className="text-sm font-semibold" style={{ color: '#6B6660' }}>{label}</span>
                  <span className="text-sm">{value || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setViewingId(null); openEdit(viewedMember) }}
                className="btn-outline flex-1 flex items-center justify-center gap-1">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => setViewingId(null)} className="btn-gold flex-1">Close</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
