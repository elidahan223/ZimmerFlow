import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Calendar as CalendarIcon } from 'lucide-react'

type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'

interface PaymentRow {
  id: string
  status: PaymentStatus
  type: 'DEPOSIT' | 'REMAINDER' | 'FULL' | 'REFUND'
  amount: string | number
  paidAt: string | null
  cardLast4: string | null
}

interface Props {
  outcome: 'success' | 'failure'
  onGoHome: () => void
  onGoMyBookings: () => void
}

function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export default function PaymentResult({ outcome, onGoHome, onGoMyBookings }: Props) {
  const bookingGroupId = readQueryParam('bookingGroupId')
  const errorParam = readQueryParam('error')
  const [payments, setPayments] = useState<PaymentRow[] | null>(null)
  const [loadingPoll, setLoadingPoll] = useState(false)

  // Poll /api/payments/by-group up to a few times. The webhook is best-effort
  // and the redirect handler verifies on arrival, so by the time the page
  // mounts the payment is *usually* already COMPLETED/FAILED — but a slow
  // Cardcom roundtrip can leave it PENDING for a second or two.
  useEffect(() => {
    if (!bookingGroupId) return
    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 6
    setLoadingPoll(true)

    async function pollOnce() {
      try {
        const res = await fetch(`/api/payments/by-group/${bookingGroupId}`)
        if (!res.ok) throw new Error('failed to fetch payments')
        const data: PaymentRow[] = await res.json()
        if (cancelled) return
        setPayments(data)
        const stillPending = data.some((p) => p.status === 'PENDING')
        if (stillPending && attempts < MAX_ATTEMPTS) {
          attempts++
          setTimeout(pollOnce, 1500)
        } else {
          setLoadingPoll(false)
        }
      } catch (_) {
        if (!cancelled) setLoadingPoll(false)
      }
    }
    pollOnce()
    return () => { cancelled = true }
  }, [bookingGroupId])

  const depositRow = payments?.find((p) => p.type === 'DEPOSIT') || null
  const finalisedAsSuccess = depositRow?.status === 'COMPLETED'

  // Trust the server, not the URL. Show success only if the backend can
  // produce a COMPLETED deposit row. Anything else (failure, empty list
  // because we hard-delete on failure, poll exhausted, network error)
  // falls through to the failure page so we never get a blank screen.
  const showSuccess = !loadingPoll && outcome === 'success' && finalisedAsSuccess
  const showFailure = !loadingPoll && !showSuccess

  return (
    <div className="max-w-xl mx-auto px-4 py-12" dir="rtl">
      {loadingPoll && !payments && (
        <div className="flex flex-col items-center gap-3 py-12 text-neutral-500">
          <Loader2 className="w-10 h-10 animate-spin" aria-hidden="true" />
          <p className="text-sm">מאמת תשלום…</p>
        </div>
      )}

      {!loadingPoll && showSuccess && (
        <div className="bg-white border border-green-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">התשלום התקבל בהצלחה</h1>
          <p className="text-sm text-neutral-600 mb-6">
            המקדמה שולמה ומספר ההזמנה שלך אושר. יתרת התשלום תשולם בעת ההגעה.
          </p>
          {depositRow && (
            <div className="bg-neutral-50 rounded-xl p-4 mb-6 text-sm text-neutral-700 space-y-1">
              <div className="flex justify-between"><span>סכום ששולם:</span><span className="font-medium">{depositRow.amount} ₪</span></div>
              {depositRow.cardLast4 && (
                <div className="flex justify-between"><span>כרטיס:</span><span className="font-medium">****{depositRow.cardLast4}</span></div>
              )}
              {depositRow.paidAt && (
                <div className="flex justify-between"><span>תאריך:</span><span className="font-medium">{new Date(depositRow.paidAt).toLocaleString('he-IL')}</span></div>
              )}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onGoMyBookings}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" aria-hidden="true" />
              להזמנות שלי
            </button>
            <button
              onClick={onGoHome}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
            >
              לדף הבית
            </button>
          </div>
        </div>
      )}

      {!loadingPoll && showFailure && (
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-9 h-9" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">התשלום לא הושלם</h1>
          <p className="text-sm text-neutral-600 mb-6">
            {errorParam === 'unknown_payment'
              ? 'לא הצלחנו למצוא את הליך התשלום. אם החיוב כן עבר, פנה אלינו ונבדוק.'
              : 'ההזמנה בוטלה אוטומטית. אם תרצה לנסות שוב, אפשר להזמין מחדש דרך דף המתחם.'}
          </p>
          {depositRow && depositRow.amount && (
            <div className="bg-neutral-50 rounded-xl p-4 mb-6 text-sm text-neutral-600">
              סכום שהיה אמור להיגבות: <span className="font-medium">{depositRow.amount} ₪</span>
            </div>
          )}
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
          >
            חזרה לדף הבית
          </button>
        </div>
      )}
    </div>
  )
}
