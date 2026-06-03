'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import { Search, Users, FolderOpen } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'

export default function GroupsSection() {
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [searchQuery, setSearchQuery]     = useState('')

  // ── Fetch teacher's groups ────────────────────────────────────────────────
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn:  () => teacherApi.getGroups().then(r => r.data),
  })

  // Set first group as default once loaded
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id)
    }
  }, [groups, selectedGroup])

  // ── Fetch students for selected group ─────────────────────────────────────
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['group-students', selectedGroup],
    queryFn:  () => teacherApi.getGroupStudents(selectedGroup).then(r => r.data),
    enabled:  !!selectedGroup,
  })

  // ── Current group info ────────────────────────────────────────────────────
  const currentGroup = groups.find((g: any) => g.id === selectedGroup)

  // ── Filtered students ─────────────────────────────────────────────────────
  const filteredStudents = students.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Student Groups" subtitle="View and manage your assigned class groups and student rosters." />

      <div className="px-6 pb-8">
        <div className="flex gap-4">

          {/* ── Group Sidebar ───────────────────────────────────────────── */}
          <div className="card w-64 flex-shrink-0 animate-in stagger-1 h-fit">
            <h3 className="font-bold mb-4">My Groups</h3>
            {groupsLoading && (
              <p className="text-sm text-center py-4" style={{ color: '#6B6660' }}>Loading groups...</p>
            )}
            <div className="space-y-1">
              {groups.map((group: any) => (
                <button key={group.id} onClick={() => { setSelectedGroup(group.id); setSearchQuery('') }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: selectedGroup === group.id ? 'rgba(201,160,32,0.1)' : 'transparent',
                    border: selectedGroup === group.id ? '1px solid rgba(201,160,32,0.3)' : '1px solid transparent',
                  }}>
                  <FolderOpen size={14} style={{ color: selectedGroup === group.id ? '#C9A020' : '#6B6660' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"
                       style={{ color: selectedGroup === group.id ? '#C9A020' : '#0D0D0D' }}>
                      {group.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#6B6660' }}>{group.subject}</p>
                  </div>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: '#F3F4F6', color: '#6B6660' }}>
                    {group.studentCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Student List ────────────────────────────────────────────── */}
          <div className="flex-1 animate-in stagger-2">

            {/* Group header */}
            {currentGroup && (
              <div className="card mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{currentGroup.name}</h2>
                    <p className="text-sm mt-0.5" style={{ color: '#6B6660' }}>
                      {currentGroup.section} · {currentGroup.subject} · {students.length} students
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6660' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or roll number..."
                className="input pl-9"
              />
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Roll No.</th>
                    <th>Student</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading && (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>
                        Loading students...
                      </td>
                    </tr>
                  )}
                  {!studentsLoading && filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className="text-center py-8">
                          <Users size={32} style={{ color: '#E4E1D8' }} className="mx-auto mb-2" />
                          <p className="text-sm" style={{ color: '#6B6660' }}>
                            {searchQuery ? 'No students match your search' : 'No students in this group'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredStudents.map((student: any) => (
                    <tr key={student.id}>
                      <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{student.rollNo}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar initials={student.avatar} />
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="text-sm" style={{ color: '#6B6660' }}>{student.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
