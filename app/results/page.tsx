'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Plus, Settings, X } from 'lucide-react'
import { adminMockViews } from '@/lib/admin-mock-db'

type Assessment = {
  id: string
  name: string
  maxScore: number
}

type GradeRule = {
  id: string
  lower: number
  upper: number
  grade: string
  remark: string
  color: string
}

const INITIAL_GRADING_SCALE: GradeRule[] = adminMockViews.results.grading_scale.map(g => ({ ...g }))
const INITIAL_ASSESSMENTS: Assessment[] = adminMockViews.results.assessments.map(a => ({ ...a }))

export default function ResultsPage() {
  const [cls, setCls] = useState('Grade 10')
  const [assessments, setAssessments] = useState<Assessment[]>(INITIAL_ASSESSMENTS)
  const [gradingScale, setGradingScale] = useState<GradeRule[]>(INITIAL_GRADING_SCALE)
  const [newAssessment, setNewAssessment] = useState({ name: '', maxScore: '' })
  const [newGrade, setNewGrade] = useState({ lower: '', upper: '', grade: '', remark: '' })
  const [disabledTemplates, setDisabledTemplates] = useState<Record<string, boolean>>({
    'JSS 3': true,
    'Grade 10': false,
  })
  const [templateByClass, setTemplateByClass] = useState<Record<string, string>>({
    'Grade 9': 'Standard Academic Template',
    'Grade 10': 'Standard Academic Template',
    'Grade 11': 'Standard Academic Template',
    'Grade 12': 'Standard Academic Template',
    'JSS 1': 'Standard Academic Template',
    'JSS 2': 'Standard Academic Template',
    'JSS 3': 'Standard Academic Template',
  })
  const [showEditAssessment, setShowEditAssessment] = useState(false)
  const [editAssessment, setEditAssessment] = useState<{ id: string; name: string; maxScore: string } | null>(null)
  const [showEditGrade, setShowEditGrade] = useState(false)
  const [editGrade, setEditGrade] = useState<{ id: string; lower: string; upper: string; grade: string; remark: string } | null>(null)

  const availableClasses = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'JSS 1', 'JSS 2', 'JSS 3']
  const availableTemplates = ['Standard Academic Template', 'Continuous Assessment focused Template']

  const isTemplateDisabled = (targetCls: string) => {
    if (targetCls === 'All Grades') {
      return availableClasses.every(c => disabledTemplates[c] === true)
    }
    return !!disabledTemplates[targetCls]
  }

  const toggleTemplate = () => {
    if (cls === 'All Grades') {
      const newState = !isTemplateDisabled('All Grades')
      const nextMap: Record<string, boolean> = {}
      availableClasses.forEach(c => nextMap[c] = newState)
      setDisabledTemplates(nextMap)
      toast.success(`Template ${newState ? 'disabled' : 'enabled'} for all grades`)
    } else {
      const newState = !disabledTemplates[cls]
      setDisabledTemplates(prev => ({ ...prev, [cls]: newState }))
      toast.success(`Template ${newState ? 'disabled' : 'enabled'} for ${cls}`)
    }
  }

  // CA Handlers
  const addAssessment = () => {
    if (!newAssessment.name || !newAssessment.maxScore) return
    const id = (assessments.length + 1).toString()
    setAssessments([...assessments, { id, name: newAssessment.name, maxScore: Number(newAssessment.maxScore) }])
    setNewAssessment({ name: '', maxScore: '' })
    toast.success('Assessment type added')
  }

  const deleteAssessment = (id: string) => {
    setAssessments(assessments.filter(a => a.id !== id))
    toast.success('Assessment type removed')
  }

  const openEditAssessment = (a: Assessment) => {
    setEditAssessment({ id: a.id, name: a.name, maxScore: String(a.maxScore) })
    setShowEditAssessment(true)
  }

  const saveEditAssessment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAssessment) return
    setAssessments(prev => prev.map(a => a.id === editAssessment.id ? { ...a, name: editAssessment.name, maxScore: Number(editAssessment.maxScore) } : a))
    toast.success('Assessment updated')
    setShowEditAssessment(false)
    setEditAssessment(null)
  }

  // Grading Scale Handlers
  const addGrade = () => {
    if (!newGrade.grade || !newGrade.lower || !newGrade.upper) return
    const id = (gradingScale.length + 1).toString()
    setGradingScale([...gradingScale, { 
      id, 
      grade: newGrade.grade, 
      lower: Number(newGrade.lower), 
      upper: Number(newGrade.upper), 
      remark: newGrade.remark,
      color: '#0D0D0D'
    }])
    setNewGrade({ lower: '', upper: '', grade: '', remark: '' })
    toast.success('Grade rule added')
  }

  const deleteGrade = (id: string) => {
    setGradingScale(gradingScale.filter(g => g.id !== id))
    toast.success('Grade rule removed')
  }

  const openEditGrade = (g: GradeRule) => {
    setEditGrade({ id: g.id, lower: String(g.lower), upper: String(g.upper), grade: g.grade, remark: g.remark })
    setShowEditGrade(true)
  }

  const saveEditGrade = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGrade) return
    setGradingScale(prev => prev.map(g => {
      if (g.id !== editGrade.id) return g
      return { ...g, lower: Number(editGrade.lower), upper: Number(editGrade.upper), grade: editGrade.grade, remark: editGrade.remark }
    }))
    toast.success('Grade rule updated')
    setShowEditGrade(false)
    setEditGrade(null)
  }

  const templateValue = (() => {
    if (cls !== 'All Grades') return templateByClass[cls] || 'Standard Academic Template'
    if (availableClasses.length === 0) return 'Standard Academic Template'
    const first = templateByClass[availableClasses[0]] || 'Standard Academic Template'
    const allSame = availableClasses.every(c => (templateByClass[c] || 'Standard Academic Template') === first)
    return allSame ? first : 'Standard Academic Template'
  })()

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Exam', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Examination & Result Processing</h1>
      </div>

      <div className="px-6 pb-8">
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* Class Selector for Configuration */}
          <div className="card">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B6660' }}>Select Class to Configure</label>
            <select value={cls} onChange={e => setCls(e.target.value)} className="select max-w-xs">
              <option value="All Grades">All Grades</option>
              {availableClasses.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Continuous Assessment Set-up */}
            <div className="space-y-4">
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 bg-gold-600 text-white flex justify-between items-center">
                  <h3 className="font-bold">Continuous Assessment Set-up for {cls}</h3>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th>Assessment</th>
                        <th>Max Obtainable Score</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a, i) => (
                        <tr key={a.id}>
                          <td className="text-xs text-gray-500">{i + 1}</td>
                          <td className="font-semibold">{a.name}</td>
                          <td className="text-center">{a.maxScore}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditAssessment(a)} className="p-1.5 rounded hover:bg-gray-100 text-blue-600"><Pencil size={14} /></button>
                              <button onClick={() => deleteAssessment(a.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* New Assessment Record Form */}
              <div className="card">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500">New Assessment Record</h3>
                <div className="space-y-3">
                  <input 
                    placeholder="New Assessment Name (e.g. FIRST C.A)" 
                    value={newAssessment.name}
                    onChange={e => setNewAssessment({...newAssessment, name: e.target.value})}
                    className="input" 
                  />
                  <input 
                    type="number" 
                    placeholder="Max Obtainable Score" 
                    value={newAssessment.maxScore}
                    onChange={e => setNewAssessment({...newAssessment, maxScore: e.target.value})}
                    className="input" 
                  />
                  <button onClick={addAssessment} className="btn-gold w-full flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Assessment
                  </button>
                </div>
              </div>
            </div>

            {/* Grade Set-up */}
            <div className="space-y-4">
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 bg-gold-600 text-white flex justify-between items-center">
                  <h3 className="font-bold">Grade Set-up for {cls}</h3>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th>Lower</th>
                        <th>Upper</th>
                        <th>Grade</th>
                        <th>Remark</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradingScale.map((g, i) => (
                        <tr key={g.id}>
                          <td className="text-xs text-gray-500">{i + 1}</td>
                          <td>{g.lower}</td>
                          <td>{g.upper}</td>
                          <td className="font-bold">{g.grade}</td>
                          <td className="text-xs text-gray-500">{g.remark}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditGrade(g)} className="p-1.5 rounded hover:bg-gray-100 text-blue-600"><Pencil size={14} /></button>
                              <button onClick={() => deleteGrade(g.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* New Grade Record Form */}
              <div className="card">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500">New Grade Record</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input 
                    type="number" placeholder="Lower Limit" 
                    value={newGrade.lower}
                    onChange={e => setNewGrade({...newGrade, lower: e.target.value})}
                    className="input" 
                  />
                  <input 
                    type="number" placeholder="Upper Limit" 
                    value={newGrade.upper}
                    onChange={e => setNewGrade({...newGrade, upper: e.target.value})}
                    className="input" 
                  />
                  <input 
                    placeholder="Grade (e.g. A1)" 
                    value={newGrade.grade}
                    onChange={e => setNewGrade({...newGrade, grade: e.target.value})}
                    className="input" 
                  />
                  <input 
                    placeholder="Remark (e.g. GOOD)" 
                    value={newGrade.remark}
                    onChange={e => setNewGrade({...newGrade, remark: e.target.value})}
                    className="input" 
                  />
                </div>
                <button onClick={addGrade} className="btn-gold w-full flex items-center justify-center gap-2">
                  <Plus size={14} /> Add Rule
                </button>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">SELECT RESULT TEMPLATE</label>
              <select
                className="select"
                value={templateValue}
                onChange={e => {
                  const nextTemplate = e.target.value
                  if (cls === 'All Grades') {
                    const nextMap: Record<string, string> = {}
                    availableClasses.forEach(c => nextMap[c] = nextTemplate)
                    setTemplateByClass(nextMap)
                    toast.success('Template updated for all grades')
                  } else {
                    setTemplateByClass(prev => ({ ...prev, [cls]: nextTemplate }))
                    toast.success(`Template updated for ${cls}`)
                  }
                }}
              >
                {availableTemplates.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className={`card flex items-center justify-between gap-3 transition-colors ${isTemplateDisabled(cls) ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isTemplateDisabled(cls) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  <Settings size={16} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isTemplateDisabled(cls) ? 'text-red-800' : 'text-green-800'}`}>
                    {isTemplateDisabled(cls) ? 'Class Template Disabled' : 'Class Template Enabled'}
                  </p>
                  <p className="text-xs opacity-70">
                    Current status for {cls}
                  </p>
                </div>
              </div>
              <button 
                onClick={toggleTemplate}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner`}
                style={{ background: isTemplateDisabled(cls) ? '#EF4444' : '#10B981' }}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300`}
                      style={{ left: isTemplateDisabled(cls) ? '4px' : '28px' }} />
              </button>
            </div>
          </div>

          {showEditAssessment && editAssessment && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Assessment</h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Update assessment name and score</p>
                  </div>
                  <button onClick={() => { setShowEditAssessment(false); setEditAssessment(null) }} className="p-2 hover:bg-gray-200 rounded-full">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <form onSubmit={saveEditAssessment} className="p-8 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Assessment Name</label>
                    <input
                      className="input w-full"
                      value={editAssessment.name}
                      onChange={e => setEditAssessment({ ...editAssessment, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Max Obtainable Score</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={editAssessment.maxScore}
                      onChange={e => setEditAssessment({ ...editAssessment, maxScore: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowEditAssessment(false); setEditAssessment(null) }} className="btn-outline px-8 py-2.5">Cancel</button>
                    <button type="submit" className="btn-gold px-8 py-2.5">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditGrade && editGrade && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Grade Rule</h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Update range, grade and remark</p>
                  </div>
                  <button onClick={() => { setShowEditGrade(false); setEditGrade(null) }} className="p-2 hover:bg-gray-200 rounded-full">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <form onSubmit={saveEditGrade} className="p-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Lower</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={editGrade.lower}
                        onChange={e => setEditGrade({ ...editGrade, lower: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Upper</label>
                      <input
                        type="number"
                        className="input w-full"
                        value={editGrade.upper}
                        onChange={e => setEditGrade({ ...editGrade, upper: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Grade</label>
                      <input
                        className="input w-full"
                        value={editGrade.grade}
                        onChange={e => setEditGrade({ ...editGrade, grade: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Remark</label>
                      <input
                        className="input w-full"
                        value={editGrade.remark}
                        onChange={e => setEditGrade({ ...editGrade, remark: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowEditGrade(false); setEditGrade(null) }} className="btn-outline px-8 py-2.5">Cancel</button>
                    <button type="submit" className="btn-gold px-8 py-2.5">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
