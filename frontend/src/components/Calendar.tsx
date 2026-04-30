import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle, Clock, XCircle, Phone, Mail, IdCard, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BookingForm from './BookingForm'
import BookingRequestModal from './BookingRequestModal'
import { getMonthHolidays } from '../utils/holidays'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
// צבעים קבועים למתחמים - כחול לראשון, ירוק לשני
const COMPOUND_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
const COMPOUND_BG = ['#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#ede9fe']
const COMPOUND_BG_STRONG = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd']

interface Room { id: string; name: string; capacity: number | null }
interface Cabin { id: string; name: string; color: string; bg: string; bgStrong: string; rooms: Room[] }
interface Booking { id: string; compoundId: string; checkIn: string; checkOut: string; guestName?: string; phone?: string; email?: string; idNumber?: string; status: string }

function toDateStr(d: string | Date) {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function Calendar() {
  const auth = useAuth()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedCabin, setSelectedCabin] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [role, setRole] = useState<'ADMIN' | 'OWNER' | 'GUEST' | null>(null)

  const fetched = useRef(false)
  const isOwner = role === 'ADMIN' || role === 'OWNER'

  // Fetch data once
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    fetch('/api/compounds')
      .then(r => r.json())
      .then(data => setCabins(data.map((c: any, i: number) => ({
        id: c.id,
        name: c.name,
        color: COMPOUND_COLORS[i % COMPOUND_COLORS.length],
        bg: COMPOUND_BG[i % COMPOUND_BG.length],
        bgStrong: COMPOUND_BG_STRONG[i % COMPOUND_BG_STRONG.length],
        rooms: (c.rooms || []).map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
      }))))
      .catch(() => {})

    loadBookings()
  }, [])

  async function loadBookings() {
    let url = '/api/bookings/availability'
    const headers: Record<string, string> = {}
    let userRole: 'ADMIN' | 'OWNER' | 'GUEST' | null = null

    if (auth.isAuthenticated) {
      const token = await auth.getValidToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        try {
          const meRes = await fetch('/api/users/me', { headers })
          if (meRes.ok) {
            const me = await meRes.json()
            userRole = me.role || 'GUEST'
            setRole(userRole)
          }
        } catch {}
        if (userRole === 'ADMIN' || userRole === 'OWNER') {
          url = '/api/bookings'
        }
      }
    }

    fetch(url, { headers })
      .then(r => r.json())
      .then(data => setBookings(data.map((b: any) => ({
        id: b.id, compoundId: b.compoundId || b.compoundId,
        checkIn: toDateStr(b.checkIn), checkOut: toDateStr(b.checkOut),
        guestName: b.customer?.fullName || '',
        phone: b.customer?.phone || '',
        email: b.customer?.email || '',
        idNumber: b.customer?.idNumber || '',
        status: b.status,
      }))))
      .catch(() => {})
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthHolidays = useMemo(() => getMonthHolidays(year, month), [year, month])

  function fmt(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function getBookings(date: string) {
    return bookings.filter(b => {
      if (selectedCabin && b.compoundId !== selectedCabin) return false
      return date >= b.checkIn && date < b.checkOut
    })
  }

  function getDayBg(date: string): { background: string } {
    const activeBookings = bookings.filter(b =>
      b.status !== 'CANCELLED' && date >= b.checkIn && date < b.checkOut
    )
    if (activeBookings.length === 0) return { background: '' }

    const bookedCompoundIds = [...new Set(activeBookings.map(b => b.compoundId))]
    const colors = bookedCompoundIds
      .map(id => cabins.find(c => c.id === id))
      .filter(Boolean)
      .map(c => c!.bg)

    if (colors.length === 1) return { background: colors[0] }
    // Multiple compounds — gradient split
    const pct = 100 / colors.length
    const stops = colors.map((c, i) => `${c} ${i * pct}% ${(i + 1) * pct}%`).join(', ')
    return { background: `linear-gradient(135deg, ${stops})` }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1)
  }

  async function updateBookingStatus(id: string, status: string) {
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) loadBookings()
    } catch {}
  }

  async function deleteBooking(id: string) {
    if (!confirm('למחוק את ההזמנה?')) return
    try {
      const token = await auth.getValidToken()
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) loadBookings()
    } catch {}
  }

  const dayDetails = selectedDay ? getBookings(selectedDay) : []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-4 pb-6 sm:pb-10">

      {/* Cabin filter */}

      {/* Cabin filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSelectedCabin(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!selectedCabin ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          הכל
        </button>
        {cabins.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCabin(selectedCabin === c.id ? null : c.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedCabin === c.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCabin === c.id ? '#fff' : c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={nextMonth} className="w-10 h-10 rounded-full hover:bg-neutral-100 active:bg-neutral-200 flex items-center justify-center transition-colors"><ChevronRight className="w-6 h-6 text-neutral-700" /></button>
          <h2 className="text-lg font-bold text-neutral-900">{HEBREW_MONTHS[month]} {year}</h2>
          <button onClick={prevMonth} className="w-10 h-10 rounded-full hover:bg-neutral-100 active:bg-neutral-200 flex items-center justify-center transition-colors"><ChevronLeft className="w-6 h-6 text-neutral-700" /></button>
        </div>

        {auth.isAuthenticated && isOwner && (
          <div className="px-5 pb-3">
            <button
              onClick={() => setShowBookingForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-medium py-2.5 rounded-xl hover:bg-neutral-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              הזמנה חדשה
            </button>
          </div>
        )}

        {auth.isAuthenticated && role === 'GUEST' && (
          <div className="px-5 pb-3">
            <button
              onClick={() => setShowRequestModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-medium py-2.5 rounded-xl hover:bg-neutral-700 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              בקשת הזמנה
            </button>
          </div>
        )}

        <div className="grid grid-cols-7 border-t border-neutral-100">
          {HEBREW_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] sm:text-xs font-medium text-neutral-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-neutral-100">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[90px]" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = fmt(day)
            const isToday = date === todayStr
            const dayBookings = getBookings(date)
            const isSelected = date === selectedDay
            const isPast = date < todayStr
            const dayInfo = monthHolidays.get(date)
            const hasHoliday = dayInfo && dayInfo.holidays.length > 0
            const hasYomTov = dayInfo?.holidays.some(h => h.isYomTov)

            const dayBg = getDayBg(date)
            const activeCount = dayBookings.filter(b => b.status !== 'CANCELLED').length

            return (
              <div
                key={day}
                onClick={() => !isPast && setSelectedDay(isSelected ? null : date)}
                className={`aspect-square sm:aspect-auto sm:min-h-[100px] border-t border-r border-neutral-100 p-1 sm:p-2 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-neutral-900 ring-inset z-10' : ''} ${isPast ? 'opacity-30' : ''}`}
                style={!isPast ? dayBg : {}}
              >
                <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm ${isToday ? 'bg-neutral-900 text-white font-semibold' : activeCount > 0 ? 'text-neutral-800 font-semibold' : 'text-neutral-700 font-medium'}`}>
                    {day}
                  </span>
                  {dayInfo && (
                    <span className="text-[8px] sm:text-[10px] text-neutral-500 leading-tight" dir="rtl">
                      {dayInfo.hebrewDate}
                    </span>
                  )}
                </div>

                {/* Holiday name - desktop */}
                {hasHoliday && (
                  <div className="hidden sm:block mt-0.5">
                    {dayInfo!.holidays.slice(0, 1).map((h: any, idx: number) => (
                      <div key={idx} className={`text-[9px] leading-tight truncate font-medium ${h.type === 'muslim' ? 'text-emerald-700' : 'text-blue-700'}`} dir="rtl">
                        {h.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Holiday dot - mobile */}
                {hasHoliday && (
                  <div className="flex sm:hidden justify-center mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dayInfo!.holidays[0].type === 'muslim' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  </div>
                )}

                {/* Booking info - desktop */}
                <div className="hidden sm:block mt-0.5 space-y-0.5">
                  {dayBookings.filter(b => b.status !== 'CANCELLED').slice(0, 2).map(b => {
                    const cabin = cabins.find(c => c.id === b.compoundId)
                    return (
                      <div key={b.id} className={`text-[10px] px-1.5 py-px rounded truncate font-medium ${b.status === 'PENDING' ? 'opacity-60' : ''}`} style={{ color: cabin?.color }}>
                        {b.checkIn === date && auth.isAuthenticated ? b.guestName : cabin?.name}
                      </div>
                    )
                  })}
                </div>

                {/* Booking dots - mobile */}
                {activeCount > 0 && (
                  <div className="flex sm:hidden gap-1 justify-center mt-1">
                    {dayBookings.filter(b => b.status !== 'CANCELLED').slice(0, 3).map(b => {
                      const cabin = cabins.find(c => c.id === b.compoundId)
                      return <span key={b.id} className="w-2 h-2 rounded-full border border-white/50" style={{ backgroundColor: cabin?.color }} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day details */}
      {selectedDay && (() => {
        const selDayInfo = monthHolidays.get(selectedDay)
        return (
        <div className="mt-4 bg-white rounded-2xl border border-neutral-200 p-5" dir="rtl">
          <h3 className="text-base font-semibold text-neutral-900 mb-1">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          {selDayInfo && (
            <p className="text-sm text-neutral-400 mb-3">{selDayInfo.hebrewDate}</p>
          )}
          {selDayInfo && selDayInfo.holidays.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selDayInfo.holidays.map((h, idx) => (
                <span key={idx} className={`text-xs font-medium px-2.5 py-1 rounded-full ${h.type === 'muslim' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  {h.name}
                </span>
              ))}
            </div>
          )}
          {dayDetails.length === 0 ? (
            <p className="text-neutral-400 text-sm">פנוי</p>
          ) : (
            <div className="space-y-2">
              {dayDetails.map(b => {
                const cabin = cabins.find(c => c.id === b.compoundId)
                return (
                  <div key={b.id} className={`p-3 rounded-xl ${b.status === 'CANCELLED' ? 'bg-red-50/50 opacity-60' : 'bg-neutral-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: cabin?.color }} />
                        <div>
                          {auth.isAuthenticated && b.guestName && <div className={`font-medium text-sm ${b.status === 'CANCELLED' ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>{b.guestName}</div>}
                          <div className={`text-xs ${b.status === 'CANCELLED' ? 'line-through text-neutral-300' : 'text-neutral-400'}`}>{cabin?.name} · {b.checkIn} → {b.checkOut}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        b.status === 'CONFIRMED' ? 'bg-neutral-900 text-white' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status === 'CONFIRMED' ? 'מאושר' : b.status === 'CANCELLED' ? 'בוטל' : 'ממתין'}
                      </span>
                    </div>

                    {auth.isAuthenticated && (b.phone || b.email || b.idNumber) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                        {b.phone && (
                          <a
                            href={`tel:${b.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors"
                            dir="ltr"
                          >
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            {b.phone}
                          </a>
                        )}
                        {b.email && (
                          <a
                            href={`mailto:${b.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors break-all"
                            dir="ltr"
                          >
                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            {b.email}
                          </a>
                        )}
                        {b.idNumber && (
                          <span className="flex items-center gap-1.5" dir="ltr">
                            <IdCard className="w-3.5 h-3.5 text-neutral-400" />
                            {b.idNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {auth.isAuthenticated && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-100">
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'CONFIRMED')}
                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            אשר
                          </button>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'PENDING')}
                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            החזר לממתין
                          </button>
                        )}
                        {b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'CANCELLED')}
                            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            בטל
                          </button>
                        )}
                        <button
                          onClick={() => deleteBooking(b.id)}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-red-100 hover:text-red-600 transition-colors mr-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          מחק
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )
      })()}

      {/* Legend */}
      {cabins.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-neutral-400">
          {cabins.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </div>
          ))}
        </div>
      )}

      {/* Booking form (owner) */}
      {showBookingForm && (
        <BookingForm
          compounds={cabins}
          onClose={() => setShowBookingForm(false)}
          onCreated={() => {
            setShowBookingForm(false)
            fetched.current = false
            loadBookings()
          }}
        />
      )}

      {/* Booking request modal (guest) */}
      {showRequestModal && (
        <BookingRequestModal
          onClose={() => setShowRequestModal(false)}
          onSubmitted={() => {
            fetched.current = false
            loadBookings()
          }}
        />
      )}
    </div>
  )
}
