import { useState, useEffect, useMemo, useRef } from 'react'
import { X, ArrowRight, ArrowLeft, Check, Phone, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import SignaturePad from './SignaturePad'
import type { SignaturePadHandle } from './SignaturePad'
import ContractDocument from './ContractDocument'
import type { ContractData } from './ContractDocument'

const OWNER_PHONE = '054-668-8566'

interface Room {
  id: string
  name: string
  capacity: number | null
}

interface Compound {
  id: string
  name: string
  capacity: number
  weekdayPrice?: number | string
  weekendPrice?: number | string
  rooms: Room[]
}

interface UserProfile {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  idNumber?: string
  address?: string
}

export interface BookingInitialValues {
  compoundIds?: string[]
  roomIds?: string[]
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  notes?: string
}

interface Props {
  onClose: () => void
  onSubmitted: () => void
  initialValues?: BookingInitialValues
}

export default function BookingRequestModal({ onClose, onSubmitted, initialValues }: Props) {
  const auth = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [compounds, setCompounds] = useState<Compound[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState('')

  const [selectedCompoundIds, setSelectedCompoundIds] = useState<string[]>(initialValues?.compoundIds || [])
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialValues?.roomIds || [])
  const [expandedCompound, setExpandedCompound] = useState<string | null>(null)
  const [checkIn, setCheckIn] = useState(initialValues?.checkIn || '')
  const [checkOut, setCheckOut] = useState(initialValues?.checkOut || '')
  const [adults, setAdults] = useState(initialValues?.adults ?? 2)
  const [children, setChildren] = useState(initialValues?.children ?? 0)
  const [checkInTime, setCheckInTime] = useState('15:00')
  const [checkOutTime, setCheckOutTime] = useState('11:00')
  const [notes, setNotes] = useState(initialValues?.notes || '')

  const [agreed, setAgreed] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const sigRef = useRef<SignaturePadHandle>(null)
  const contractRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const token = await auth.getValidToken()
        const [profRes, compRes] = await Promise.all([
          fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/compounds'),
        ])
        if (profRes.ok) setProfile(await profRes.json())
        if (compRes.ok) {
          const data = await compRes.json()
          setCompounds(data)
        }
      } catch {
        setError('שגיאה בטעינת נתונים')
      }
    }
    load()
  }, [])

  function toggleCompound(compoundId: string) {
    const c = compounds.find((x) => x.id === compoundId)
    if (!c) return
    const compoundRoomIds = c.rooms.map((r) => r.id)
    if (selectedCompoundIds.includes(compoundId)) {
      setSelectedCompoundIds((prev) => prev.filter((id) => id !== compoundId))
      setSelectedRoomIds((prev) => prev.filter((id) => !compoundRoomIds.includes(id)))
    } else {
      setSelectedCompoundIds((prev) => [...prev, compoundId])
      setSelectedRoomIds((prev) => [...prev, ...compoundRoomIds.filter((id) => !prev.includes(id))])
    }
  }

  function toggleRoom(roomId: string, compoundId: string) {
    const c = compounds.find((x) => x.id === compoundId)
    if (!c) return
    const compoundRoomIds = c.rooms.map((r) => r.id)
    if (selectedRoomIds.includes(roomId)) {
      const remaining = selectedRoomIds.filter((id) => id !== roomId)
      setSelectedRoomIds(remaining)
      // If no rooms of this compound remain, deselect the compound
      if (!remaining.some((id) => compoundRoomIds.includes(id))) {
        setSelectedCompoundIds((prev) => prev.filter((id) => id !== compoundId))
      }
    } else {
      setSelectedRoomIds((prev) => [...prev, roomId])
      if (!selectedCompoundIds.includes(compoundId)) {
        setSelectedCompoundIds((prev) => [...prev, compoundId])
      }
    }
  }

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    return Math.max(0, Math.round(ms / 86400000))
  }, [checkIn, checkOut])

  const totalPrice = useMemo(() => {
    if (selectedCompoundIds.length === 0 || nights <= 0) return null
    let grand = 0
    let priced = false
    for (const cid of selectedCompoundIds) {
      const c = compounds.find((x) => x.id === cid)
      if (!c) continue
      const wd = parseFloat(String(c.weekdayPrice || 0))
      const we = parseFloat(String(c.weekendPrice || 0))
      if (!wd && !we) continue
      priced = true
      const start = new Date(checkIn)
      for (let i = 0; i < nights; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const dow = d.getDay()
        grand += dow === 5 || dow === 6 ? we : wd
      }
    }
    return priced ? Math.round(grand) : null
  }, [selectedCompoundIds, compounds, nights, checkIn])

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
  const todayStr = new Date().toISOString().slice(0, 10)

  // Build per-compound roomIds map (compoundId -> selected rooms in it). Empty = whole compound.
  const compoundRoomsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const cid of selectedCompoundIds) {
      const c = compounds.find((x) => x.id === cid)
      if (!c) continue
      const compoundRoomIds = c.rooms.map((r) => r.id)
      const picked = selectedRoomIds.filter((id) => compoundRoomIds.includes(id))
      // If all rooms picked OR no rooms exist on compound — book whole compound (empty array)
      const isWhole = c.rooms.length === 0 || picked.length === c.rooms.length
      map.set(cid, isWhole ? [] : picked)
    }
    return map
  }, [selectedCompoundIds, selectedRoomIds, compounds])

  const bookingItems = useMemo(() => {
    return selectedCompoundIds.map((cid) => {
      const c = compounds.find((x) => x.id === cid)
      if (!c) return { compoundName: '?', roomsLabel: '?' }
      const picked = compoundRoomsMap.get(cid) || []
      const isWhole = picked.length === 0
      const roomsLabel = isWhole
        ? 'כל המתחם'
        : 'חדרים: ' + picked.map((rid) => c.rooms.find((r) => r.id === rid)?.name || '').filter(Boolean).join(', ')
      return { compoundName: c.name, roomsLabel }
    })
  }, [selectedCompoundIds, compoundRoomsMap, compounds])

  const contractData: ContractData = {
    customerName: fullName,
    customerIdNumber: profile?.idNumber || '',
    customerPhone: profile?.phone || '',
    customerAddress: profile?.address || '',
    bookingItems,
    checkIn,
    checkOut,
    checkInTime,
    checkOutTime,
    nights,
    adults,
    children,
    totalPrice,
    signatureDataUrl,
    signedDate: todayStr,
  }

  function canProceedStep1() {
    if (selectedCompoundIds.length === 0) return false
    if (!checkIn || !checkOut) return false
    if (nights <= 0) return false
    if (new Date(checkIn) < new Date(todayStr)) return false
    return true
  }

  async function handleSubmit() {
    setError('')
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('יש לחתום על החוזה לפני שליחה')
      return
    }
    if (!agreed) {
      setError('יש לאשר שקראת את תנאי החוזה')
      return
    }

    setSubmitting(true)
    try {
      const sig = sigRef.current.toDataURL()
      setSignatureDataUrl(sig)

      const token = await auth.getValidToken()
      const compoundsPayload = selectedCompoundIds.map((cid) => ({
        compoundId: cid,
        roomIds: compoundRoomsMap.get(cid) || [],
      }))

      const res = await fetch('/api/bookings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          compounds: compoundsPayload,
          checkIn,
          checkOut,
          checkInTime,
          checkOutTime,
          adults,
          children,
          guestsCount: adults + children,
          customerNotes: notes || undefined,
          signatureBase64: sig,
          totalPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בשליחת בקשה')

      const firstId = data.bookings?.[0]?.id || ''
      setBookingId(firstId)
      setStep(3)
    } catch (e: any) {
      setError(e?.message || 'שגיאה בעיבוד הבקשה')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-all'

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">
            {step === 1 && 'בקשת הזמנה — פרטי שהייה'}
            {step === 2 && 'בקשת הזמנה — חתימה על החוזה'}
            {step === 3 && 'הבקשה התקבלה'}
          </h2>
          <button onClick={onClose} aria-label="סגור" className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center">
            <X className="w-5 h-5 text-neutral-500" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">מתחמים וחדרים</label>
                <div className="space-y-1.5">
                  {compounds.map((c) => {
                    const isSelected = selectedCompoundIds.includes(c.id)
                    const isExpanded = expandedCompound === c.id
                    const compoundRoomIds = c.rooms.map((r) => r.id)
                    const selectedCount = selectedRoomIds.filter((id) => compoundRoomIds.includes(id)).length
                    const allRoomsSelected = c.rooms.length > 0 && selectedCount === c.rooms.length
                    return (
                      <div key={c.id}>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCompound(c.id)}
                            className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                              isSelected
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.name}</span>
                              {c.rooms.length > 0 && selectedCount > 0 && !allRoomsSelected && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-neutral-200'}`}>
                                  {selectedCount}/{c.rooms.length}
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                          {c.rooms.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedCompound(isExpanded ? null : c.id)}
                              className="flex items-center justify-center w-10 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-all"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && c.rooms.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 mt-1.5 mr-4">
                            {c.rooms.map((r) => {
                              const roomSelected = selectedRoomIds.includes(r.id)
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => toggleRoom(r.id, c.id)}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                                    roomSelected
                                      ? 'border-neutral-700 bg-neutral-700 text-white'
                                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                                  }`}
                                >
                                  <div className="text-right">
                                    <div className="font-medium text-xs">{r.name}</div>
                                    {r.capacity != null && (
                                      <div className={`text-[10px] ${roomSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                        עד {r.capacity}
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
                <p className="text-xs text-neutral-400 mt-1.5">
                  לחץ על מתחם להזמנה מלאה, או הרחב ובחר חדרים ספציפיים. ניתן לבחור יותר ממתחם אחד.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">צ׳ק־אין</label>
                  <input type="date" min={todayStr} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">צ׳ק־אאוט</label>
                  <input type="date" min={checkIn || todayStr} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">שעת כניסה</label>
                  <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">שעת יציאה</label>
                  <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">מבוגרים</label>
                  <input type="number" min={1} value={adults} onChange={(e) => setAdults(parseInt(e.target.value) || 1)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">ילדים</label>
                  <input type="number" min={0} value={children} onChange={(e) => setChildren(parseInt(e.target.value) || 0)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">הערות (אופציונלי)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="בקשות מיוחדות..." />
              </div>

              {nights > 0 && (
                <div className="bg-neutral-50 rounded-xl p-3 text-sm text-neutral-600 space-y-1">
                  <div>מספר לילות: <b className="text-neutral-900">{nights}</b></div>
                  {totalPrice != null && (
                    <div>סה"כ משוער: <b className="text-neutral-900">{totalPrice} ₪</b></div>
                  )}
                  <div className="text-xs text-neutral-400">המחיר הסופי יאושר על־ידי בעל המקום.</div>
                </div>
              )}

              {!profile?.phone && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  שים לב: חסרים פרטים בפרופיל שלך. עדכן בהגדרות לפני הגשת הבקשה.
                </div>
              )}

              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                קרא את החוזה בעיון. בסיום, חתום בתיבה למטה ואשר.
              </p>

              <div className="border border-neutral-200 rounded-xl overflow-auto max-h-[55vh] bg-neutral-50">
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'top right', display: 'inline-block' }}>
                  <ContractDocument ref={contractRef} data={contractData} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">חתימה</label>
                <SignaturePad ref={sigRef} height={160} />
                <button
                  type="button"
                  onClick={() => sigRef.current?.clear()}
                  className="mt-2 text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  נקה חתימה
                </button>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-neutral-900"
                />
                <span className="text-sm text-neutral-700">
                  קראתי את תנאי החוזה והבנתי אותם, ואני מאשר את ההזמנה לפי תנאים אלה.
                </span>
              </label>

              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">הבקשה נשלחה בהצלחה</h3>
              {bookingId && (
                <p className="text-sm text-neutral-500">
                  מספר הזמנה: <span className="font-mono text-neutral-800">{bookingId.slice(0, 8)}</span>
                </p>
              )}
              <div className="bg-neutral-50 rounded-xl p-4 max-w-sm mx-auto">
                <p className="text-sm text-neutral-700 mb-3">
                  לאישור סופי של ההזמנה, צור קשר עם בעל המקום:
                </p>
                <a
                  href={`tel:${OWNER_PHONE.replace(/-/g, '')}`}
                  className="flex items-center justify-center gap-2 bg-neutral-900 text-white py-3 rounded-xl font-medium hover:bg-neutral-700 transition-colors"
                  dir="ltr"
                >
                  <Phone className="w-4 h-4" />
                  {OWNER_PHONE}
                </a>
              </div>
              <p className="text-xs text-neutral-400">החוזה החתום נשמר במערכת.</p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 p-4 flex items-center justify-between gap-2">
          {step === 1 && (
            <>
              <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-800">
                ביטול
              </button>
              <button
                onClick={() => {
                  setError('')
                  if (!canProceedStep1()) {
                    setError('יש לבחור מתחם ותאריכים תקינים')
                    return
                  }
                  setStep(2)
                }}
                className="flex items-center gap-1.5 bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-700 transition-colors"
              >
                המשך
                <ArrowLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
              >
                <ArrowRight className="w-4 h-4" />
                חזור
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    אישור ושליחה
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              onClick={() => {
                onSubmitted()
                onClose()
              }}
              className="ml-auto bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-700 transition-colors"
            >
              סגירה
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
