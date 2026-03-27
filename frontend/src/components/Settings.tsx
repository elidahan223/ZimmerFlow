import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, Home, Users, DoorOpen } from 'lucide-react'
import CompoundForm from './CompoundForm'

export interface ImageRecord {
  id: string
  url: string
  sortOrder: number
}

export interface Room {
  id: string
  name: string
  description?: string
  capacity?: number
  sortOrder: number
  images?: ImageRecord[]
}

export interface Compound {
  id: string
  name: string
  description?: string
  tagline?: string
  capacity: number
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  weekdayPrice: string
  weekendPrice: string
  holidayPrice?: string
  yardDescription?: string
  rooms: Room[]
  images?: ImageRecord[]
  _count?: { bookings: number }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'פעיל', color: 'bg-emerald-50 text-emerald-700' },
  INACTIVE: { label: 'לא פעיל', color: 'bg-neutral-100 text-neutral-500' },
  MAINTENANCE: { label: 'בתחזוקה', color: 'bg-amber-50 text-amber-700' },
}

export default function Settings() {
  const auth = useAuth()
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCompound, setEditingCompound] = useState<Compound | null>(null)

  useEffect(() => {
    fetchCompounds()
  }, [])

  async function fetchCompounds() {
    try {
      const res = await fetch('/api/compounds/admin/all', {
        headers: { 'Authorization': `Bearer ${await auth.getValidToken()}` },
      })
      if (res.ok) {
        setCompounds(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch compounds', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את "${name}"?`)) return
    try {
      const res = await fetch(`/api/compounds/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await auth.getValidToken()}` },
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'שגיאה במחיקה')
        return
      }
      fetchCompounds()
    } catch {
      alert('שגיאה במחיקה')
    }
  }

  function openEdit(compound: Compound) {
    setEditingCompound(compound)
    setShowForm(true)
  }

  function openCreate() {
    setEditingCompound(null)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditingCompound(null)
    fetchCompounds()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">ניהול מתחמים</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          מתחם חדש
        </button>
      </div>

      {compounds.length === 0 ? (
        <div className="text-center py-16">
          <Home className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 text-lg mb-2">אין מתחמים עדיין</p>
          <p className="text-neutral-400 text-sm mb-6">הוסף את המתחם הראשון שלך כדי להתחיל</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף מתחם
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {compounds.map((compound) => {
            const st = statusLabels[compound.status] || statusLabels.ACTIVE
            return (
              <div
                key={compound.id}
                className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openEdit(compound)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-neutral-900">{compound.name}</h3>
                    {compound.tagline && (
                      <p className="text-sm text-neutral-400 mt-0.5">{compound.tagline}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                {compound.description && (
                  <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{compound.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    עד {compound.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5" />
                    {compound.rooms.length} חדרים
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-neutral-900 font-semibold">
                    ₪{parseFloat(compound.weekdayPrice).toLocaleString()}
                  </span>
                  <span className="text-neutral-400">יום חול</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-neutral-900 font-semibold">
                    ₪{parseFloat(compound.weekendPrice).toLocaleString()}
                  </span>
                  <span className="text-neutral-400">סופ"ש</span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(compound) }}
                    className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    עריכה
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(compound.id, compound.name) }}
                    className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    מחיקה
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CompoundForm
          compound={editingCompound}
          onClose={() => { setShowForm(false); setEditingCompound(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
