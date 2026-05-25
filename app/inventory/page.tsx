'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { inventoryApi } from '@/lib/api'
import { AlertTriangle, ShoppingCart, MoreVertical, X, Check, PackagePlus, UserMinus } from 'lucide-react'
import { adminMockViews } from '@/lib/admin-mock-db'

const CATS = ['All Categories', 'Books & Media', 'Furniture', 'Lab Equipment', 'Stationary', 'IT & Electronics']
const STATUS_OPTS = ['All Items', 'In Stock', 'Low Stock Alert']
const MOCK_STAFF = adminMockViews.inventory.staff

const MOCK_ITEMS = { total: adminMockViews.inventory.total, items: adminMockViews.inventory.items }
type InventoryItem = {
  id: string
  name: string
  category: string
  stock: number
  reorder: number
  status: string
}

export default function InventoryPage() {
  const [cat, setCat] = useState('All Categories')
  const [stockStatus, setStockStatus] = useState('All Items')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [localItems, setLocalItems] = useState<InventoryItem[]>(() => [...MOCK_ITEMS.items])

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: '',
    reorder: ''
  })

  const [issueData, setIssueData] = useState({
    itemId: '',
    quantity: '',
    recipient: '',
    notes: ''
  })

  const { data: queryData } = useQuery({
    queryKey: ['inventory', cat, stockStatus],
    queryFn: () => inventoryApi.list({ category: cat, status: stockStatus }).then(r => r.data),
    placeholderData: MOCK_ITEMS,
    enabled: false // Using local state for simulation
  })

  const filtered = localItems.filter((item) => {
    if (cat !== 'All Categories' && item.category !== cat) return false
    if (stockStatus === 'In Stock' && item.status !== 'Optimal') return false
    if (stockStatus === 'Low Stock Alert' && item.status !== 'Low Stock') return false
    return true
  })

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault()
    const newStock = parseInt(formData.stock)
    const reorderLevel = parseInt(formData.reorder)
    
    const newItem: InventoryItem = {
      id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      category: formData.category,
      stock: newStock,
      reorder: reorderLevel,
      status: newStock <= reorderLevel ? 'Low Stock' : 'Optimal'
    }

    setLocalItems(prev => [newItem, ...prev])
    setShowAddForm(false)
    setFormData({ name: '', category: '', stock: '', reorder: '' })
  }

  const handleIssueItem = (e: React.FormEvent) => {
    e.preventDefault()
    const quantityToIssue = parseInt(issueData.quantity)
    
    setLocalItems(prev => prev.map(item => {
      if (item.id === issueData.itemId) {
        const newStock = item.stock - quantityToIssue
        return {
          ...item,
          stock: newStock,
          status: newStock <= item.reorder ? 'Low Stock' : 'Optimal'
        }
      }
      return item
    }))

    setShowIssueForm(false)
    setIssueData({ itemId: '', quantity: '', recipient: '', notes: '' })
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Entry', onClick: () => setShowAddForm(true) }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">{showAddForm ? 'Add New Stock' : showIssueForm ? 'Issue Inventory Item' : 'Inventory Management'}</h1>
        <p className="page-subtitle">
          {showAddForm 
            ? 'Record new assets and equipment into the institutional inventory.' 
            : showIssueForm
            ? 'Record the distribution of assets to staff or departments.'
            : 'Monitor stock levels, reorder thresholds, and track asset distribution.'}
        </p>
      </div>

      <div className="px-6 pb-8">
        {showAddForm ? (
          <div className="animate-in">
            <button 
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform" 
              style={{ color: '#C9A020' }}
            >
              <X size={16} />
              Cancel and Return
            </button>

            <div className="card max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: '#E4E1D8' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,160,32,0.1)' }}>
                  <PackagePlus size={20} style={{ color: '#C9A020' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Stock Details</h3>
                  <p className="text-xs" style={{ color: '#6B6660' }}>Enter information about the new inventory item.</p>
                </div>
              </div>

              <form onSubmit={handleAddStock} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="label">Item Name</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="e.g. Ergonomic Office Chair" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="label">Category</label>
                    <select 
                      className="select" 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      required
                    >
                      <option value="">Select Category</option>
                      {CATS.filter(c => c !== 'All Categories').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Initial Stock Quantity</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="0" 
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      required 
                    />
                  </div>

                  <div>
                    <label className="label">Reorder Level (Alert Threshold)</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="e.g. 10" 
                      value={formData.reorder}
                      onChange={e => setFormData({...formData, reorder: e.target.value})}
                      required 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: '#E4E1D8' }}>
                  <button type="button" onClick={() => setShowAddForm(false)} className="btn-outline px-8">Cancel</button>
                  <button type="submit" className="btn-gold px-10 flex items-center gap-2">
                    <Check size={18} /> Confirm Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : showIssueForm ? (
          <div className="animate-in">
            <button 
              onClick={() => setShowIssueForm(false)}
              className="flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform" 
              style={{ color: '#C9A020' }}
            >
              <X size={16} />
              Cancel and Return
            </button>

            <div className="card max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: '#E4E1D8' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,160,32,0.1)' }}>
                  <UserMinus size={20} style={{ color: '#C9A020' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Issue Item</h3>
                  <p className="text-xs" style={{ color: '#6B6660' }}>Record who is receiving this inventory item.</p>
                </div>
              </div>

              <form onSubmit={handleIssueItem} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="label">Select Item</label>
                    <select 
                      className="select" 
                      value={issueData.itemId}
                      onChange={e => setIssueData({...issueData, itemId: e.target.value})}
                      required
                    >
                      <option value="">Select Item from Inventory</option>
                      {localItems.filter(item => item.stock > 0).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.stock} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Quantity to Issue</label>
                    <input 
                      type="number" 
                      className="input" 
                      placeholder="1" 
                      max={localItems.find(i => i.id === issueData.itemId)?.stock || 1}
                      min="1"
                      value={issueData.quantity}
                      onChange={e => setIssueData({...issueData, quantity: e.target.value})}
                      required 
                    />
                  </div>

                  <div>
                    <label className="label">Issue To (Staff Member)</label>
                    <select 
                      className="select" 
                      value={issueData.recipient}
                      onChange={e => setIssueData({...issueData, recipient: e.target.value})}
                      required
                    >
                      <option value="">Select Recipient</option>
                      {MOCK_STAFF.map(staff => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Additional Notes</label>
                    <textarea 
                      className="input min-h-[100px] py-2" 
                      placeholder="e.g. Issued for the new Science Lab setup." 
                      value={issueData.notes}
                      onChange={e => setIssueData({...issueData, notes: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: '#E4E1D8' }}>
                  <button type="button" onClick={() => setShowIssueForm(false)} className="btn-outline px-8">Cancel</button>
                  <button type="submit" className="btn-gold px-10 flex items-center gap-2">
                    <Check size={18} /> Confirm Issue Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Sidebar filters */}
            <div className="w-52 flex-shrink-0 space-y-4 animate-in stagger-1">
              <div className="card">
                <h3 className="font-bold mb-3">Categories</h3>
                <div className="space-y-1">
                  {CATS.map(c => (
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
                  Showing 1–{filtered.length} of {localItems.length} items
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowIssueForm(true)}
                    className="btn-dark text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    Issue Item
                  </button>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    + Add Stock
                  </button>
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
                  {filtered.map((item: any) => {
                    const isLow = item.status === 'Low Stock'
                    return (
                      <tr key={item.id} className="animate-in fade-in">
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
                            <button className="p-1.5 rounded-lg hover:bg-gray-100">
                              <ShoppingCart size={15} style={{ color: '#C9A020' }} />
                            </button>
                          ) : (
                            <button className="p-1.5 rounded-lg hover:bg-gray-100">
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
        )}
      </div>
    </AppLayout>
  )
}
