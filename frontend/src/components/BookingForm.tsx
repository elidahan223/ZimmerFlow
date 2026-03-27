import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { X } from 'lucide-react'

interface Cabin {
  id: string
  name: string
}

interface Props {
  cabins: Cabin[]
  onClose: () => void
  onCreated: () => void
}

export default function BookingForm({ cabins, onClose, onCreated }: Props) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    cabinId: cabins[0]?.id || '',
    checkIn: '',
    checkOut: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerIdNumber: '',
    guestsCount: '2',
    customerNotes: '',
  })

  const nights = form.checkIn && form.checkOut
    ? Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const set = (key: string, value: string) => setForm({ ...form, [key]: value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.getValidToken()}`,
        },
        body: JSON.stringify({
          cabinId: form.cabinId,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestsCount: parseInt(form.guestsCount) || 2,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || undefined,
          customerIdNumber: form.customerIdNumber || undefined,
          customerNotes: form.customerNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
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
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1" style={{ direction: 'ltr' }}>
          <div className="p-7" style={{ direction: 'rtl' }}>
          <h2 className="text-xl font-bold text-neutral-900 mb-6 text-center">הזמנה חדשה</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cabin select */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">צימר *</label>
              <select
                value={form.cabinId}
                onChange={(e) => set('cabinId', e.target.value)}
                className={inputClass}
              >
                {cabins.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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

            {/* Guests + Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">מספר אורחים</label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.guestsCount}
                onChange={(e) => set('guestsCount', e.target.value)}
                className={inputClass + ' w-24'}
                dir="ltr"
              />
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
              disabled={loading || !form.customerName || !form.customerPhone || !form.checkIn || !form.checkOut}
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
