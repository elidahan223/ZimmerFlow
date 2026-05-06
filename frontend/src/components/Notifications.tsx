import { useEffect, useState } from 'react'
import { Check, X, FileText, Phone, Mail, IdCard, Loader2, Inbox, Calendar as CalendarIcon, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Customer {
  id: string
  fullName: string
  phone: string
  email: string | null
  idNumber: string | null
}

interface Compound {
  id: string
  name: string
}

interface Room {
  id: string
  name: string
}

interface BookingRoom {
  room: Room
}

interface Contract {
  id: string
  status: string
  contractNumber: string
  signedAt: string | null
}

interface PendingBooking {
  id: string
  checkIn: string
  checkOut: string
  guestsCount: number
  adults: number
  children: number
  customerNotes: string | null
  createdAt: string
  customer: Customer
  compound: Compound
  bookingRooms: BookingRoom[]
  contracts: Contract[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Notifications() {
  const auth = useAuth()
  const [bookings, setBookings] = useState<PendingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const token = await auth.getValidToken()
      const res = await fetch('/api/bookings/pending', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('שגיאה בטעינת בקשות')
      setBookings(await res.json())
    } catch (e: any) {
      setError(e?.message || 'שגיאה')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function approve(id: string) {
    setActionLoading(id)
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      })
      if (!res.ok) throw new Error('שגיאה באישור')
      await load()
    } catch (e: any) {
      alert(e?.message || 'שגיאה')
    } finally {
      setActionLoading(null)
    }
  }

  async function reject(id: string) {
    if (!confirm('לדחות את הבקשה? ההזמנה תימחק והחוזה יוסר.')) return
    setActionLoading(id)
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('שגיאה בדחייה')
      await load()
    } catch (e: any) {
      alert(e?.message || 'שגיאה')
    } finally {
      setActionLoading(null)
    }
  }

  async function viewContract(contractId: string) {
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/contracts/${contractId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('שגיאה בפתיחת חוזה')
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      alert(e?.message || 'שגיאה')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-4 pb-6 sm:pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-neutral-900">התראות — בקשות ממתינות</h1>
        <span className="text-sm text-neutral-500">{bookings.length} בקשות</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="bg-neutral-50 rounded-2xl p-10 text-center">
          <Inbox className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">אין בקשות ממתינות לאישור</p>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const contract = b.contracts[0]
          const rooms = b.bookingRooms.map((br) => br.room.name).join(', ')
          const isLoading = actionLoading === b.id
          return (
            <div key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-neutral-900">{b.customer.fullName}</h3>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      ממתין
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mb-3">
                    התקבל {fmtDate(b.createdAt)}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CalendarIcon className="w-4 h-4 text-neutral-400" />
                      <span>{b.compound.name}</span>
                      {rooms && <span className="text-neutral-400">· {rooms}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <span className="text-neutral-400 text-xs">תאריכים:</span>
                      <span>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <span>{b.adults} מבוגרים{b.children > 0 ? ` + ${b.children} ילדים` : ''}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
                    {b.customer.phone && (
                      <a href={`tel:${b.customer.phone}`} className="flex items-center gap-1 hover:text-neutral-900" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        {b.customer.phone}
                      </a>
                    )}
                    {b.customer.email && (
                      <a href={`mailto:${b.customer.email}`} className="flex items-center gap-1 hover:text-neutral-900 break-all" dir="ltr">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        {b.customer.email}
                      </a>
                    )}
                    {b.customer.idNumber && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <IdCard className="w-3.5 h-3.5 text-neutral-400" />
                        {b.customer.idNumber}
                      </span>
                    )}
                  </div>

                  {b.customerNotes && (
                    <div className="mt-2 text-xs bg-neutral-50 rounded-lg p-2 text-neutral-600">
                      <b>הערות:</b> {b.customerNotes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-100">
                {contract && (
                  <button
                    onClick={() => viewContract(contract.id)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    הצג חוזה חתום
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => reject(b.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  דחיית בקשה
                </button>
                <button
                  onClick={() => approve(b.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  אישור
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
