import { useEffect, useState } from 'react'
import { FileText, Download, Loader2, Inbox, CheckCircle, Clock, XCircle, Calendar as CalendarIcon, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
  contractNumber: string
  status: string
  signedAt: string | null
}

interface MyBooking {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  checkIn: string
  checkOut: string
  guestsCount: number
  adults: number
  children: number
  customerNotes: string | null
  createdAt: string
  compound: Compound
  bookingRooms: BookingRoom[]
  contracts: Contract[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABELS: Record<MyBooking['status'], { label: string; className: string; Icon: typeof CheckCircle }> = {
  PENDING: { label: 'ממתין לאישור', className: 'bg-amber-100 text-amber-800', Icon: Clock },
  CONFIRMED: { label: 'מאושר', className: 'bg-green-100 text-green-800', Icon: CheckCircle },
  CANCELLED: { label: 'בוטל', className: 'bg-red-100 text-red-700', Icon: XCircle },
  COMPLETED: { label: 'הסתיים', className: 'bg-neutral-200 text-neutral-700', Icon: CheckCircle },
}

export default function MyBookings() {
  const auth = useAuth()
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyContract, setBusyContract] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const token = await auth.getValidToken()
        const res = await fetch('/api/bookings/mine', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('שגיאה בטעינת ההזמנות שלך')
        setBookings(await res.json())
      } catch (e: any) {
        setError(e?.message || 'שגיאה')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function openContract(contractId: string, download: boolean) {
    setBusyContract(contractId + (download ? ':d' : ':v'))
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/contracts/${contractId}/download${download ? '?download=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('שגיאה בפתיחת חוזה')
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      alert(e?.message || 'שגיאה')
    } finally {
      setBusyContract(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-4 pb-6 sm:pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-neutral-900">ההזמנות שלי</h1>
        <span className="text-sm text-neutral-500">{bookings.length} הזמנות</span>
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
          <p className="text-neutral-500">עדיין לא ביצעת בקשות הזמנה</p>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const statusInfo = STATUS_LABELS[b.status]
          const contract = b.contracts[0]
          const rooms = b.bookingRooms.map((br) => br.room.name).join(', ')
          return (
            <div key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-neutral-900 text-base">{b.compound.name}</h3>
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                  <statusInfo.Icon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-neutral-700">
                  <CalendarIcon className="w-4 h-4 text-neutral-400" />
                  <span>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</span>
                </div>
                {rooms && (
                  <div className="flex items-center gap-2 text-neutral-700">
                    <span className="text-neutral-400 text-xs">חדרים:</span>
                    <span>{rooms}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-neutral-700">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <span>{b.adults} מבוגרים{b.children > 0 ? ` + ${b.children} ילדים` : ''}</span>
                </div>
              </div>

              {b.customerNotes && (
                <div className="mt-2 text-xs bg-neutral-50 rounded-lg p-2 text-neutral-600">
                  <b>הערות:</b> {b.customerNotes}
                </div>
              )}

              <div className="text-xs text-neutral-400 mt-3">
                נשלח {fmtDate(b.createdAt)}
                {contract && <> · חוזה #{contract.contractNumber}</>}
              </div>

              {contract && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                  <button
                    onClick={() => openContract(contract.id, false)}
                    disabled={busyContract !== null}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {busyContract === contract.id + ':v' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    צפייה בחוזה
                  </button>
                  <button
                    onClick={() => openContract(contract.id, true)}
                    disabled={busyContract !== null}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    {busyContract === contract.id + ':d' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    הורדה
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
