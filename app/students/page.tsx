'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { studentApi } from '@/lib/api'
import { getInitials } from '@/lib/utils'
import { adminMockViews } from '@/lib/admin-mock-db'
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, X, Phone, Mail, MapPin, User, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

type Student = {
  id: string
  name: string
  grade: string
  section: string
  admission_no: string
  parent: string
  email: string
  phone: string
  address: string
  gender: 'Male' | 'Female' | 'Other'
  dob: string
  status: 'Active' | 'Inactive'
  avatar: string
}

type StudentsQueryData = {
  data: Student[]
  total: number
  last_page: number
}

const INITIAL_STUDENTS: Student[] = adminMockViews.students.students.map(s => ({ ...s }))

export default function StudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [status, setStatus] = useState('')
  
  const [localStudents, setLocalStudents] = useState<Student[]>(INITIAL_STUDENTS)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editFormData, setEditFormData] = useState<Student | null>(null)
  const [addFormData, setAddFormData] = useState<Omit<Student, 'id'>>({
    name: '', grade: 'Grade 10', section: 'Section A', admission_no: '', parent: '', email: '', phone: '', address: '', gender: 'Male', dob: '', status: 'Active', avatar: ''
  })

  const itemsPerPage = 10

  const { data = { data: localStudents, total: localStudents.length, last_page: Math.ceil(localStudents.length / itemsPerPage) } } = useQuery<StudentsQueryData>({
    queryKey: ['students', page, search, grade, status, localStudents],
    queryFn: () => studentApi.list({ page, search, grade, status, per_page: itemsPerPage }).then(r => r.data),
    placeholderData: { data: localStudents, total: localStudents.length, last_page: Math.ceil(localStudents.length / itemsPerPage) },
  })

  // Filter simulation
  const filteredData = localStudents.filter(st => {
    return (search === '' || st.name.toLowerCase().includes(search.toLowerCase()) || st.admission_no.toLowerCase().includes(search.toLowerCase())) &&
           (grade === '' || st.grade === grade) &&
           (status === '' || st.status === status)
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student)
    setShowDetails(true)
  }

  const handleEditClick = (student: Student) => {
    setEditFormData({ ...student })
    setShowEdit(true)
    setShowDetails(false)
  }

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFormData) return
    setLocalStudents(prev => prev.map(s => s.id === editFormData.id ? editFormData : s))
    toast.success(`${editFormData.name}'s information updated!`)
    setShowEdit(false)
  }

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault()
    const newStudent: Student = {
      ...addFormData,
      id: (Math.max(...localStudents.map(s => parseInt(s.id))) + 1).toString()
    }
    setLocalStudents(prev => [newStudent, ...prev])
    toast.success(`${newStudent.name} added to the system!`)
    setShowAdd(false)
    setAddFormData({
      name: '', grade: 'Grade 10', section: 'Section A', admission_no: '', parent: '', email: '', phone: '', address: '', gender: 'Male', dob: '', status: 'Active', avatar: ''
    })
  }

  const handleAvatarUpload = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.')
      return
    }
    const maxBytes = 2 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error('Image is too large. Please upload a file under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setAddFormData(prev => ({ ...prev, avatar: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteStudent = (id: string) => {
    if (confirm('Are you sure you want to remove this student record?')) {
      setLocalStudents(prev => prev.filter(s => s.id !== id))
      toast.success('Student record removed successfully')
    }
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Student', onClick: () => setShowAdd(true) }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Student Information System</h1>
        <p className="page-subtitle">Manage student records, personal details, and academic history.</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Filters */}
        <div className="card animate-in stagger-1">
          <div className="flex flex-wrap gap-3">
            <input placeholder="Search name or ID…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                   className="input w-56" />
            <select value={grade} onChange={e => { setGrade(e.target.value); setPage(1); }} className="select w-44">
              <option value="">All Grades</option>
              {['Grade 9','Grade 10','Grade 11','Grade 12'].map(g => <option key={g}>{g}</option>)}
            </select>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden animate-in stagger-2">
          <div className="table-wrapper">
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
                {paginatedData.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        {st.avatar ? (
                          <img
                            src={st.avatar}
                            alt={st.name}
                            className="w-9 h-9 rounded-full object-cover border flex-shrink-0"
                            style={{ borderColor: '#E4E1D8' }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                               style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                            {getInitials(st.name)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{st.name}</p>
                          <p className="text-[10px]" style={{ color: '#A09080' }}>ID: {st.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{st.admission_no}</td>
                    <td className="text-sm" style={{ color: '#6B6660' }}>{st.grade} / {st.section}</td>
                    <td className="text-sm" style={{ color: '#6B6660' }}>{st.parent}</td>
                    <td>
                      <span className={`badge text-[10px] px-2 py-0.5 rounded-full font-bold ${st.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {st.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => handleViewDetails(st)} className="p-1.5 rounded-lg hover:bg-gold-50 transition-colors" title="View Details">
                          <Eye size={14} className="text-gold-600" />
                        </button>
                        <button onClick={() => handleEditClick(st)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit Record">
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button onClick={() => handleDeleteStudent(st.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete Record">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">No students found matching the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: '#E4E1D8' }}>
              <span className="text-sm" style={{ color: '#6B6660' }}>
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} students
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} 
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50" style={{ borderColor: '#E4E1D8' }}>
                  <ChevronLeft size={14} />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                          style={{ 
                            background: page === i + 1 ? '#C9A020' : 'transparent', 
                            color: page === i + 1 ? 'white' : '#0D0D0D', 
                            border: page === i + 1 ? 'none' : '1px solid #E4E1D8' 
                          }}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50" style={{ borderColor: '#E4E1D8' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showDetails && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative h-24 bg-gradient-to-r from-gold-600 to-gold-400">
              <button onClick={() => setShowDetails(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white">
                <X size={20} />
              </button>
              <div className="absolute -bottom-10 left-8">
                {selectedStudent.avatar ? (
                  <img
                    src={selectedStudent.avatar}
                    alt={selectedStudent.name}
                    className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                       style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                    {getInitials(selectedStudent.name)}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-12 pb-8 px-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                  <p className="text-gold-600 font-semibold">{selectedStudent.grade} · {selectedStudent.section}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${selectedStudent.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {selectedStudent.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Student Profile</h3>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><User size={16} /></div>
                    <span className="text-sm font-medium">{selectedStudent.gender} · {selectedStudent.admission_no}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><Calendar size={16} /></div>
                    <span className="text-sm font-medium">Born {selectedStudent.dob}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><MapPin size={16} /></div>
                    <span className="text-sm font-medium">{selectedStudent.address}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Guardian Contact</h3>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><User size={16} /></div>
                    <span className="text-sm font-medium">{selectedStudent.parent}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><Mail size={16} /></div>
                    <span className="text-sm font-medium">{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gold-600"><Phone size={16} /></div>
                    <span className="text-sm font-medium">{selectedStudent.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowDetails(false)} className="btn-outline px-6">Close</button>
                <button onClick={() => handleEditClick(selectedStudent)} className="btn-gold px-6 flex items-center gap-2">
                  <Pencil size={16} /> Edit Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEdit && editFormData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Student Record</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">ID: {editFormData.id}</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Full Name</label>
                  <input type="text" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Grade</label>
                  <select value={editFormData.grade} onChange={e => setEditFormData({...editFormData, grade: e.target.value})} className="select w-full">
                    {['Grade 9','Grade 10','Grade 11','Grade 12'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Section</label>
                  <input type="text" required value={editFormData.section} onChange={e => setEditFormData({...editFormData, section: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Parent/Guardian</label>
                  <input type="text" required value={editFormData.parent} onChange={e => setEditFormData({...editFormData, parent: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Status</label>
                  <select value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value as Student['status']})} className="select w-full">
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-outline px-8 py-2.5">Cancel</button>
                <button type="submit" className="btn-gold px-8 py-2.5 shadow-lg shadow-gold-500/20">Update Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Student Admission</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Complete the enrollment form</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-8 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    {addFormData.avatar ? (
                      <img
                        src={addFormData.avatar}
                        alt="Student profile preview"
                        className="w-16 h-16 rounded-2xl object-cover border"
                        style={{ borderColor: '#E4E1D8' }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border flex items-center justify-center text-xs font-bold text-gray-400"
                           style={{ borderColor: '#E4E1D8' }}>
                        No Photo
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleAvatarUpload(e.target.files?.[0] || null)}
                        className="input w-full"
                      />
                      <div className="mt-1 flex items-center gap-2">
                        {addFormData.avatar && (
                          <button type="button" onClick={() => setAddFormData(prev => ({ ...prev, avatar: '' }))} className="text-xs font-semibold hover:underline" style={{ color: '#C9A020' }}>
                            Remove photo
                          </button>
                        )}
                        <span className="text-[11px]" style={{ color: '#A09080' }}>PNG/JPG, max 2MB</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Full Name</label>
                  <input type="text" required placeholder="Student's full name" value={addFormData.name} onChange={e => setAddFormData({...addFormData, name: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Grade</label>
                  <select value={addFormData.grade} onChange={e => setAddFormData({...addFormData, grade: e.target.value})} className="select w-full">
                    {['Grade 9','Grade 10','Grade 11','Grade 12'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Section</label>
                  <input type="text" required placeholder="e.g. Section A" value={addFormData.section} onChange={e => setAddFormData({...addFormData, section: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Admission No.</label>
                  <input type="text" required placeholder="ADM-2024-XXX" value={addFormData.admission_no} onChange={e => setAddFormData({...addFormData, admission_no: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Gender</label>
                  <select value={addFormData.gender} onChange={e => setAddFormData({...addFormData, gender: e.target.value as Student['gender']})} className="select w-full">
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Parent/Guardian</label>
                  <input type="text" required placeholder="Primary contact name" value={addFormData.parent} onChange={e => setAddFormData({...addFormData, parent: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone Number</label>
                  <input type="text" required placeholder="+234..." value={addFormData.phone} onChange={e => setAddFormData({...addFormData, phone: e.target.value})} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Date of Birth</label>
                  <input type="date" required value={addFormData.dob} onChange={e => setAddFormData({...addFormData, dob: e.target.value})} className="input w-full" />
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-outline px-8 py-2.5">Cancel</button>
                <button type="submit" className="btn-gold px-8 py-2.5 shadow-lg shadow-gold-500/20">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
