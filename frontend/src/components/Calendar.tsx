import { useState, useEffect, useRef } from 'react'
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BookingForm from './BookingForm'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
const HEBREW_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const CABIN_COLORS = ['#262626', '#737373', '#a3a3a3', '#525252', '#d4d4d4']

interface Cabin { id: string; name: string; color: string }
interface Booking { id: string; cabinId: string; checkIn: string; checkOut: string; guestName?: string; status: string }

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

  const fetched = useRef(false)

  // Fetch data once
  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    fetch('/api/cabins')
      .then(r => r.json())
      .then(data => setCabins(data.map((c: any, i: number) => ({ id: c.id, name: c.name, color: CABIN_COLORS[i % CABIN_COLORS.length] }))))
      .catch(() => {})

    loadBookings()
  }, [])

  async function loadBookings() {
    const headers: Record<string, string> = {}
    let url = '/api/bookings/availability'
    if (auth.isAuthenticated) {
      const token = await auth.getValidToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        url = '/api/bookings'
      }
    }
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => setBookings(data.map((b: any) => ({
        id: b.id, cabinId: b.cabinId,
        checkIn: toDateStr(b.checkIn), checkOut: toDateStr(b.checkOut),
        guestName: b.customer?.fullName || '', status: b.status,
      }))))
      .catch(() => {})
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  function fmt(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function getBookings(date: string) {
    return bookings.filter(b => {
      if (b.status === 'CANCELLED') return false
      if (selectedCabin && b.cabinId !== selectedCabin) return false
      return date >= b.checkIn && date < b.checkOut
    })
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1)
  }

  const dayDetails = selectedDay ? getBookings(selectedDay) : []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">

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
          <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><ChevronRight className="w-5 h-5 text-neutral-600" /></button>
          <h2 className="text-lg font-semibold text-neutral-900">{HEBREW_MONTHS[month]} {year}</h2>
          <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-neutral-600" /></button>
        </div>

        {auth.isAuthenticated && (
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

            return (
              <div
                key={day}
                onClick={() => !isPast && setSelectedDay(isSelected ? null : date)}
                className={`aspect-square sm:aspect-auto sm:min-h-[90px] border-t border-r border-neutral-50 p-1 sm:p-2 cursor-pointer transition-colors ${isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50/50'} ${isPast ? 'opacity-30' : ''}`}
              >
                <div className="flex items-center justify-center sm:justify-start">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs sm:text-sm ${isToday ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-700 font-medium'}`}>
                    {day}
                  </span>
                </div>

                {dayBookings.length > 0 && (
                  <div className="flex sm:hidden gap-0.5 justify-center mt-1">
                    {dayBookings.slice(0, 3).map(b => {
                      const cabin = cabins.find(c => c.id === b.cabinId)
                      return <span key={b.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cabin?.color || '#666', opacity: b.status === 'PENDING' ? 0.5 : 1 }} />
                    })}
                  </div>
                )}

                <div className="hidden sm:block mt-1 space-y-0.5">
                  {dayBookings.slice(0, 2).map(b => {
                    const cabin = cabins.find(c => c.id === b.cabinId)
                    return (
                      <div key={b.id} className="text-[10px] text-white px-1.5 py-px rounded truncate" style={{ backgroundColor: cabin?.color || '#666', opacity: b.status === 'PENDING' ? 0.6 : 1 }}>
                        {b.checkIn === date && auth.isAuthenticated ? b.guestName : '\u00A0'}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day details */}
      {selectedDay && (
        <div className="mt-4 bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          {dayDetails.length === 0 ? (
            <p className="text-neutral-400 text-sm">פנוי</p>
          ) : (
            <div className="space-y-2">
              {dayDetails.map(b => {
                const cabin = cabins.find(c => c.id === b.cabinId)
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full" style={{ backgroundColor: cabin?.color }} />
                      <div>
                        {auth.isAuthenticated && b.guestName && <div className="font-medium text-neutral-800 text-sm">{b.guestName}</div>}
                        <div className="text-xs text-neutral-400">{cabin?.name} · {b.checkIn} → {b.checkOut}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${b.status === 'CONFIRMED' ? 'bg-neutral-900 text-white' : 'bg-amber-100 text-amber-700'}`}>
                      {b.status === 'CONFIRMED' ? 'מאושר' : 'ממתין'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Booking form */}
      {showBookingForm && (
        <BookingForm
          cabins={cabins}
          onClose={() => setShowBookingForm(false)}
          onCreated={() => {
            setShowBookingForm(false)
            fetched.current = false
            loadBookings()
          }}
        />
      )}
    </div>
  )
}
