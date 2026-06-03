'use client'
import { useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { adminMockDb } from '@/lib/admin-mock-db'
import { AlertTriangle, MoreVertical, ShoppingCart, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATS = ['All Categories', 'Books & Media', 'Furniture', 'Lab Equipment', 'Stationary', 'IT & Electronics']
const STATUS_OPTS = ['All Items', 'In Stock', 'Low Stock Alert']

const MOCK_ITEMS = {
  total: 248,
  items: [
    { id: 'INV-1042', name: 'Advanced Physics Textbook', category: 'Books & Media', stock: 145, reorder: 50, status: 'Optimal' },
    { id: 'INV-2091', name: 'Student Desks (Standard)', category: 'Furniture', stock: 12, reorder: 20, status: 'Low Stock' },
    { id: 'INV-3015', name: 'Beaker Set 500ml', category: 'Lab Equipment', stock: 88, reorder: 30, status: 'Optimal' },
    { id: 'INV-4402', name: 'Dry Erase Markers (Pack)', category: 'Stationary', stock: 5, reorder: 25, status: 'Low Stock' },
    { id: 'INV-5110', name: 'Chromebook Pro', category: 'IT & Electronics', stock: 42, reorder: 10, status: 'Optimal' },
  ]
}

type InventoryLot = {
  id: string
  receivedAt: string
  qty: number
}

type InventoryItem = {
  id: string
  name: string
  category: string
  reorder: number
  lots: InventoryLot[]
}

type IssueToType = 'Student' | 'Staff' | 'Other'

type IssueLog = {
  id: string
  itemId: string
  itemName: string
  qty: number
  issuedToType: IssueToType
  issuedToName: string
  issueDate: string
  note: string
  reference: string
}

function toIsoDate(value: Date) {
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function sumStock(lots: InventoryLot[]) {
  return lots.reduce((acc, lot) => acc + lot.qty, 0)
}

function generateInventoryId(existing: Set<string>) {
  for (let i = 0; i < 20; i++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000))
    const id = `INV-${suffix}`
    if (!existing.has(id)) return id
  }
  return `INV-${Date.now()}`
}

export default function InventoryPage() {
  const [categories, setCategories] = useState<string[]>(() => CATS.filter((c) => c !== 'All Categories'))
  const allCategories = useMemo(() => ['All Categories', ...categories], [categories])
  const [cat, setCat] = useState('All Categories')
  const [stockStatus, setStockStatus] = useState('All Items')

  const [items, setItems] = useState<InventoryItem[]>(() => {
    const now = new Date()
    const isoToday = toIsoDate(now)
    const isoLastWeek = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))
    const isoLastMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30))

    return MOCK_ITEMS.items.map((it) => {
      const first = Math.max(1, Math.floor(it.stock * 0.45))
      const second = Math.max(0, Math.floor(it.stock * 0.35))
      const third = Math.max(0, it.stock - first - second)
      const lots: InventoryLot[] = [
        { id: `lot_${it.id}_1`, receivedAt: isoLastMonth, qty: first },
        { id: `lot_${it.id}_2`, receivedAt: isoLastWeek, qty: second },
        { id: `lot_${it.id}_3`, receivedAt: isoToday, qty: third },
      ].filter((l) => l.qty > 0)

      return {
        id: it.id,
        name: it.name,
        category: it.category,
        reorder: it.reorder,
        lots,
      }
    })
  })

  const rows = useMemo(() => {
    return items.map((item) => {
      const stock = sumStock(item.lots)
      const isLow = stock <= item.reorder
      return {
        ...item,
        stock,
        status: isLow ? 'Low Stock' : 'Optimal',
      }
    })
  }, [items])

  const filtered = useMemo(() => {
    return rows.filter((item) => {
      if (cat !== 'All Categories' && item.category !== cat) return false
      if (stockStatus === 'In Stock' && item.status !== 'Optimal') return false
      if (stockStatus === 'Low Stock Alert' && item.status !== 'Low Stock') return false
      return true
    })
  }, [rows, cat, stockStatus])

  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const openAddCategory = () => {
    setNewCategoryName('')
    setShowAddCategory(true)
  }

  const saveCategory = () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('Please enter a category name.')
      return
    }

    setCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === name.toLowerCase())
      if (exists) {
        toast.error('Category already exists.')
        return prev
      }
      toast.success('Category created.')
      return [...prev, name].sort((a, b) => a.localeCompare(b))
    })

    setShowAddCategory(false)
  }

  const [showAddStock, setShowAddStock] = useState(false)
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing')
  const [addItemId, setAddItemId] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [newItemReorder, setNewItemReorder] = useState<string>('')
  const [addQty, setAddQty] = useState<string>('')
  const [addDate, setAddDate] = useState<string>(() => toIsoDate(new Date()))

  const openAddStock = (itemId?: string) => {
    const mode: 'existing' | 'new' = itemId ? 'existing' : 'existing'
    setAddMode(mode)
    setAddItemId(itemId ?? '')
    setNewItemName('')
    setNewItemCategory('')
    setNewItemReorder('')
    setAddQty('')
    setAddDate(toIsoDate(new Date()))
    setShowAddStock(true)
  }

  const saveAddStock = () => {
    const qty = Number(addQty)
    const receivedAt = addDate || toIsoDate(new Date())

    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity.')
      return
    }

    if (addMode === 'new') {
      const name = newItemName.trim()
      const category = newItemCategory.trim()
      const reorder = Number(newItemReorder)

      if (!name) {
        toast.error('Please enter the item name.')
        return
      }
      if (!category) {
        toast.error('Please select a category.')
        return
      }
      if (!Number.isFinite(reorder) || reorder < 0) {
        toast.error('Please enter a valid reorder level.')
        return
      }

      setItems((prev) => {
        const existing = new Set(prev.map((p) => p.id))
        const id = generateInventoryId(existing)
        const lot: InventoryLot = { id: `lot_${id}_${Date.now()}`, receivedAt, qty }
        const next: InventoryItem = { id, name, category, reorder, lots: [lot] }
        return [next, ...prev]
      })

      toast.success('Item created and stock added.')
      setShowAddStock(false)
      return
    }

    const itemId = addItemId.trim()
    if (!itemId) {
      toast.error('Please select an item.')
      return
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        const lot: InventoryLot = {
          id: `lot_${it.id}_${Date.now()}`,
          receivedAt,
          qty,
        }
        return { ...it, lots: [...it.lots, lot] }
      })
    )
    toast.success('Stock added.')
    setShowAddStock(false)
  }

  const [showIssue, setShowIssue] = useState(false)
  const [issueItemId, setIssueItemId] = useState<string>('')
  const [issueQty, setIssueQty] = useState<string>('')
  const [issueToType, setIssueToType] = useState<IssueToType>('Student')
  const [issueToId, setIssueToId] = useState<string>('')
  const [issueToOtherName, setIssueToOtherName] = useState('')
  const [issueDate, setIssueDate] = useState<string>(() => toIsoDate(new Date()))
  const [issueReference, setIssueReference] = useState('')
  const [issueNote, setIssueNote] = useState('')
  const [issueLogs, setIssueLogs] = useState<IssueLog[]>([])

  const studentOptions = useMemo(() => {
    return adminMockDb.students.map((s) => ({ id: s.id, name: s.name }))
  }, [])

  const staffOptions = useMemo(() => {
    return adminMockDb.staff_members.map((s) => ({ id: s.id, name: s.name }))
  }, [])

  const openIssueItem = (itemId?: string) => {
    setIssueItemId(itemId ?? '')
    setIssueQty('')
    setIssueToType('Student')
    setIssueToId('')
    setIssueToOtherName('')
    setIssueDate(toIsoDate(new Date()))
    setIssueReference('')
    setIssueNote('')
    setShowIssue(true)
  }

  const commitIssue = () => {
    const itemId = issueItemId.trim()
    const qty = Number(issueQty)

    if (!itemId) {
      toast.error('Please select an item.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity.')
      return
    }

    const current = items.find((i) => i.id === itemId)
    if (!current) {
      toast.error('Item not found.')
      return
    }

    const issuedToName = (() => {
      if (issueToType === 'Other') return issueToOtherName.trim()
      const id = issueToId.trim()
      if (!id) return ''
      const source = issueToType === 'Student' ? studentOptions : staffOptions
      return source.find((x) => x.id === id)?.name ?? ''
    })()

    if (!issuedToName) {
      toast.error('Please select who you are issuing to.')
      return
    }

    const available = sumStock(current.lots)
    if (qty > available) {
      toast.error(`Insufficient stock. Available: ${available}`)
      return
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        const lots = [...it.lots].sort((a, b) => {
          const da = new Date(a.receivedAt).getTime()
          const db = new Date(b.receivedAt).getTime()
          return da - db
        })

        let remaining = qty
        const nextLots: InventoryLot[] = []
        for (const lot of lots) {
          if (remaining <= 0) {
            nextLots.push(lot)
            continue
          }
          const take = Math.min(lot.qty, remaining)
          const left = lot.qty - take
          remaining -= take
          if (left > 0) nextLots.push({ ...lot, qty: left })
        }

        return { ...it, lots: nextLots }
      })
    )

    setIssueLogs((prev) => {
      const now = new Date()
      const log: IssueLog = {
        id: `issue_${now.getTime()}`,
        itemId: current.id,
        itemName: current.name,
        qty,
        issuedToType: issueToType,
        issuedToName,
        issueDate: issueDate || toIsoDate(now),
        note: issueNote.trim(),
        reference: issueReference.trim(),
      }
      return [log, ...prev]
    })

    toast.success(`Issued ${qty} to ${issuedToName}.`)
    setShowIssue(false)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Entry', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">Monitor stock levels, reorder thresholds, and track asset distribution.</p>
      </div>

      <div className="px-6 pb-8">
        <div className="flex gap-4">
          {/* Sidebar filters */}
          <div className="w-52 flex-shrink-0 space-y-4 animate-in stagger-1">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Categories</h3>
                <button className="btn-outline text-xs px-2 py-1" onClick={openAddCategory}>+ Add</button>
              </div>
              <div className="space-y-1">
                {allCategories.map(c => (
                  <label key={c} className="flex items-center gap-2.5 py-1 cursor-pointer">
                    <input type="checkbox" checked={cat === c} onChange={() => setCat(c)}
                           className="w-4 h-4 rounded" style={{ accentColor: '#C9A020' }} />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold mb-3">Stock Status</h3>
              <div className="space-y-1">
                {STATUS_OPTS.map(s => (
                  <label key={s} className="flex items-center gap-2.5 py-1 cursor-pointer">
                    <input type="radio" name="stockStatus" checked={stockStatus === s} onChange={() => setStockStatus(s)}
                           className="w-4 h-4" style={{ accentColor: '#C9A020' }} />
                    <span className="text-sm" style={{ color: s === 'Low Stock Alert' ? '#C9A020' : 'inherit', fontWeight: s === 'Low Stock Alert' ? 600 : 400 }}>
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 card p-0 overflow-hidden animate-in stagger-2">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E4E1D8' }}>
              <span className="text-sm" style={{ color: '#6B6660' }}>
                Showing 1–{filtered.length} of {rows.length} items
              </span>
              <div className="flex gap-2">
                <button className="btn-dark text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => openIssueItem()}>Issue Item</button>
                <button className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1" onClick={() => openAddStock()}>+ Add Stock</button>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isLow = item.status === 'Low Stock'
                  return (
                    <tr key={item.id}>
                      <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{item.id}</td>
                      <td className="font-medium">{item.name}</td>
                      <td style={{ color: '#6B6660' }}>{item.category}</td>
                      <td>
                        <span className={`font-semibold ${isLow ? 'flex items-center gap-1' : ''}`}
                              style={{ color: isLow ? '#F59E0B' : '#0D0D0D' }}>
                          {isLow && <AlertTriangle size={13} />}
                          {item.stock}
                        </span>
                      </td>
                      <td style={{ color: '#6B6660' }}>{item.reorder}</td>
                      <td>
                        {isLow ? (
                          <span className="badge badge-orange">Low Stock</span>
                        ) : (
                          <span className="badge badge-green">Optimal</span>
                        )}
                      </td>
                      <td>
                        {isLow ? (
                          <button className="p-1.5 rounded-lg hover:bg-gray-100" onClick={() => openAddStock(item.id)}>
                            <ShoppingCart size={15} style={{ color: '#C9A020' }} />
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-lg hover:bg-gray-100" onClick={() => openIssueItem(item.id)}>
                            <MoreVertical size={15} style={{ color: '#6B6660' }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: '#E4E1D8' }}>
              <button className="btn-outline text-xs">Previous</button>
              <button className="btn-outline text-xs">Next</button>
            </div>
          </div>
        </div>
      </div>

      {showAddStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Add Stock</h2>
              <button onClick={() => setShowAddStock(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Mode</label>
                <select value={addMode} onChange={(e) => setAddMode(e.target.value as 'existing' | 'new')} className="select">
                  <option value="existing">Add stock to existing item</option>
                  <option value="new">Create new item + add stock</option>
                </select>
              </div>

              {addMode === 'existing' ? (
                <div className="md:col-span-2">
                  <label className="label">Item</label>
                  <select value={addItemId} onChange={(e) => setAddItemId(e.target.value)} className="select">
                    <option value="">Select Item</option>
                    {rows.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.id} — {it.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <label className="label">Item Name</label>
                    <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="input" placeholder="e.g. Whiteboard Marker" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} className="select">
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button type="button" className="btn-outline text-xs mt-2" onClick={openAddCategory}>
                      + New Category
                    </button>
                  </div>
                  <div>
                    <label className="label">Reorder Level</label>
                    <input value={newItemReorder} onChange={(e) => setNewItemReorder(e.target.value)} className="input" inputMode="numeric" placeholder="e.g. 20" />
                  </div>
                </>
              )}

              <div>
                <label className="label">Quantity Added</label>
                <input value={addQty} onChange={(e) => setAddQty(e.target.value)} className="input" inputMode="numeric" placeholder="e.g. 25" />
              </div>
              <div>
                <label className="label">Received Date</label>
                <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="input" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddStock(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={saveAddStock} className="btn-gold px-10">Add Stock</button>
            </div>
          </div>
        </div>
      )}

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Issue Item</h2>
              <button onClick={() => setShowIssue(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Item</label>
                <select value={issueItemId} onChange={(e) => setIssueItemId(e.target.value)} className="select">
                  <option value="">Select Item</option>
                  {rows.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.id} — {it.name} (Available: {it.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Issue To</label>
                <select value={issueToType} onChange={(e) => setIssueToType(e.target.value as IssueToType)} className="select">
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {issueToType === 'Other' ? (
                <div>
                  <label className="label">Recipient Name</label>
                  <input value={issueToOtherName} onChange={(e) => setIssueToOtherName(e.target.value)} className="input" placeholder="e.g. Science Lab" />
                </div>
              ) : (
                <div>
                  <label className="label">{issueToType}</label>
                  <select value={issueToId} onChange={(e) => setIssueToId(e.target.value)} className="select">
                    <option value="">Select {issueToType}</option>
                    {(issueToType === 'Student' ? studentOptions : staffOptions).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Quantity Issued</label>
                <input value={issueQty} onChange={(e) => setIssueQty(e.target.value)} className="input" inputMode="numeric" placeholder="e.g. 5" />
              </div>

              <div>
                <label className="label">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Reference (Optional)</label>
                <input value={issueReference} onChange={(e) => setIssueReference(e.target.value)} className="input" placeholder="e.g. REQ-00012" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Note / Purpose</label>
                <input value={issueNote} onChange={(e) => setIssueNote(e.target.value)} className="input" placeholder="e.g. Issued for Chemistry practical class" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowIssue(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={commitIssue} className="btn-dark px-10">Issue</button>
            </div>
          </div>
        </div>
      )}

      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">New Category</h2>
              <button onClick={() => setShowAddCategory(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="label">Category Name</label>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="input" placeholder="e.g. Sports Equipment" />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddCategory(false)} className="btn-outline px-8">Cancel</button>
              <button onClick={saveCategory} className="btn-gold px-10">Create</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
