import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface Room {
  id: string
  name: string
  capacity: number | null
}

interface Compound {
  id: string
  name: string
  rooms: Room[]
}

interface Props {
  compounds: Compound[]
  onClose: () => void
  onCreated: () => void
}

export default function BookingForm({ compounds, onClose, onCreated }: Props) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [selectedCompoundIds, setSelectedCompoundIds] = useState<string[]>([])
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [expandedCompound, setExpandedCompound] = useState<string | null>(null)
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerIdNumber: '',
    adults: '2',
    children: '0',
    customerNotes: '',
  })

  const allRoomIds = compounds.flatMap(c => c.rooms.map(r => r.id))

  function handleSelectAll() {
    if (selectAll) {
      setSelectAll(false)
      setSelectedCompoundIds([])
      setSelectedRoomIds([])
    } else {
      setSelectAll(true)
      setSelectedCompoundIds(compounds.map(c => c.id))
      setSelectedRoomIds(allRoomIds)
      setExpandedCompound(null)
    }
  }

  function toggleCompound(compoundId: string) {
    const compound = compounds.find(c => c.id === compoundId)
    if (!compound) return
    const compoundRoomIds = compound.rooms.map(r => r.id)

    if (selectedCompoundIds.includes(compoundId)) {
      // Deselect compound and its rooms
      setSelectedCompoundIds(prev => prev.filter(id => id !== compoundId))
      setSelectedRoomIds(prev => prev.filter(id => !compoundRoomIds.includes(id)))
      setSelectAll(false)
    } else {
      // Select compound and all its rooms
      setSelectedCompoundIds(prev => [...prev, compoundId])
      setSelectedRoomIds(prev => [...prev, ...compoundRoomIds.filter(id => !prev.includes(id))])
    }
  }

  function toggleRoom(roomId: string, compoundId: string) {
    const compound = compounds.find(c => c.id === compoundId)
    if (!compound) return
    const compoundRoomIds = compound.rooms.map(r => r.id)

    if (selectedRoomIds.includes(roomId)) {
      const newRoomIds = selectedRoomIds.filter(id => id !== roomId)
      setSelectedRoomIds(newRoomIds)
      // If no rooms left from this compound, deselect compound
      if (!compoundRoomIds.some(id => newRoomIds.includes(id))) {
        setSelectedCompoundIds(prev => prev.filter(id => id !== compoundId))
      }
      setSelectAll(false)
    } else {
      const newRoomIds = [...selectedRoomIds, roomId]
      setSelectedRoomIds(newRoomIds)
      // Auto-select compound if not selected
      if (!selectedCompoundIds.includes(compoundId)) {
        setSelectedCompoundIds(prev => [...prev, compoundId])
      }
    }
  }

  // Sync selectAll
  useEffect(() => {
    if (compounds.length > 0 && selectedCompoundIds.length === compounds.length && selectedRoomIds.length === allRoomIds.length) {
      setSelectAll(true)
    }
  }, [selectedCompoundIds, selectedRoomIds])

  const nights = form.checkIn && form.checkOut
    ? Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const set = (key: string, value: string) => setForm({ ...form, [key]: value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCompoundIds.length === 0) {
      setError('יש לבחור לפחות מתחם אחד')
      return
    }
    if (!form.customerName || !form.customerPhone) {
      setError('שם וטלפון הם שדות חובה')
      return
    }
    if (!form.checkIn || !form.checkOut) {
      setError('יש לבחור תאריכי כניסה ויציאה')
      return
    }
    if (form.checkOut <= form.checkIn) {
      setError('תאריך יציאה חייב להיות אחרי תאריך כניסה')
      return
    }
    setError('')
    setLoading(true)
    try {
      const token = await auth.getValidToken()
      // Create one booking per selected compound
      for (const cId of selectedCompoundIds) {
        const compound = compounds.find(c => c.id === cId)
        const compoundRoomIds = compound?.rooms.map(r => r.id) || []
        const roomIds = selectedRoomIds.filter(id => compoundRoomIds.includes(id))

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            compoundId: cId,
            roomIds: roomIds.length > 0 ? roomIds : undefined,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            adults: parseInt(form.adults) || 2,
          children: parseInt(form.children) || 0,
          guestsCount: (parseInt(form.adults) || 2) + (parseInt(form.children) || 0),
            customerName: form.customerName,
            customerPhone: form.customerPhone,
            customerEmail: form.customerEmail || undefined,
            customerIdNumber: form.customerIdNumber || undefined,
            customerNotes: form.customerNotes || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      }
      onCreated()
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת ההזמנה')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 transition-all"

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] relative shadow-xl flex flex-col overflow-hidden" dir="rtl">
        <button
          onClick={onClose}
          aria-label="סגור טופס"
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-700 transition-colors z-10"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="overflow-y-auto flex-1" style={{ direction: 'ltr' }}>
          <div className="p-7" style={{ direction: 'rtl' }}>
          <h2 className="text-xl font-bold text-neutral-900 mb-6 text-center">הזמנה חדשה</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Compound & Room selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">מתחמים וחדרים *</label>
              <div className="space-y-1.5">
                {/* Select all */}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    selectAll
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="font-medium">הכל</span>
                  {selectAll && <Check className="w-4 h-4" />}
                </button>

                {/* Compounds */}
                {compounds.map(compound => {
                  const isSelected = selectedCompoundIds.includes(compound.id)
                  const isExpanded = expandedCompound === compound.id
                  const compoundRoomIds = compound.rooms.map(r => r.id)
                  const selectedCount = selectedRoomIds.filter(id => compoundRoomIds.includes(id)).length
                  const allSelected = compound.rooms.length > 0 && selectedCount === compound.rooms.length

                  return (
                    <div key={compound.id}>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleCompound(compound.id)}
                          className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{compound.name}</span>
                            {selectedCount > 0 && !allSelected && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-neutral-200'}`}>
                                {selectedCount}/{compound.rooms.length}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                        {compound.rooms.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCompound(isExpanded ? null : compound.id)}
                            className="flex items-center justify-center w-10 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-all"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Rooms */}
                      {isExpanded && compound.rooms.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5 mr-4">
                          {compound.rooms.map(room => {
                            const roomSelected = selectedRoomIds.includes(room.id)
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => toggleRoom(room.id, compound.id)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                                  roomSelected
                                    ? 'border-neutral-700 bg-neutral-700 text-white'
                                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                                }`}
                              >
                                <div className="text-right">
                                  <div className="font-medium text-xs">{room.name}</div>
                                  {room.capacity && (
                                    <div className={`text-[10px] ${roomSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                      עד {room.capacity}
                                    </div>
                                  )}
                                </div>
                                {roomSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedCompoundIds.length > 0 && (
                <p className="text-xs text-neutral-400 mt-1.5">
                  {selectedCompoundIds.length} מתחמים · {selectedRoomIds.length} חדרים
                </p>
              )}
            </div>

            {/* Date selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">צ׳ק-אין *</label>
                <input
                  type="date"
                  required
                  value={form.checkIn}
                  onChange={(e) => set('checkIn', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">צ׳ק-אאוט *</label>
                <input
                  type="date"
                  required
                  value={form.checkOut}
                  onChange={(e) => set('checkOut', e.target.value)}
                  min={form.checkIn || new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>
            </div>

            {nights > 0 && (
              <div className="bg-neutral-50 rounded-xl px-4 py-2 text-center text-sm text-neutral-600">
                {nights} לילות
              </div>
            )}

            {/* Customer details */}
            <div className="border-t border-neutral-100 pt-4">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">פרטי לקוח</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">שם מלא *</label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => set('customerName', e.target.value)}
                    className={inputClass}
                    placeholder="שם פרטי ומשפחה"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">טלפון *</label>
                  <input
                    type="tel"
                    required
                    value={form.customerPhone}
                    onChange={(e) => set('customerPhone', e.target.value)}
                    className={inputClass}
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">תעודת זהות</label>
                  <input
                    type="text"
                    value={form.customerIdNumber}
                    onChange={(e) => set('customerIdNumber', e.target.value)}
                    className={inputClass}
                    placeholder="מספר תעודת זהות"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => set('customerEmail', e.target.value)}
                    className={inputClass}
                    placeholder="your@email.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">מבוגרים</label>
                <input
                  type="number"
                  min="1"
                  value={form.adults}
                  onChange={(e) => set('adults', e.target.value)}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">ילדים</label>
                <input
                  type="number"
                  min="0"
                  value={form.children}
                  onChange={(e) => set('children', e.target.value)}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">הערות</label>
              <textarea
                value={form.customerNotes}
                onChange={(e) => set('customerNotes', e.target.value)}
                className={inputClass + ' h-20 resize-none'}
                placeholder="הערות מיוחדות..."
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || selectedCompoundIds.length === 0 || !form.customerName || !form.customerPhone || !form.checkIn || !form.checkOut}
              className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40"
            >
              {loading ? 'שומר...' : 'יצירת הזמנה'}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
