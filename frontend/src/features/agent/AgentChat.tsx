import { useState, useEffect, useRef } from 'react'
import { X, Send, FileSignature } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import BookingRequestModal, { type BookingInitialValues } from '../booking/BookingRequestModal'

interface Message {
  role: 'user' | 'assistant'
  content: any
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  text: string
}

interface ProposedBooking {
  compoundId: string
  checkIn: string
  checkOut: string
  guestsCount: number
  adults: number | null
  children: number | null
  roomIds: string[]
  notes: string
}

interface Props {
  compoundId: string
  compoundName?: string
}

const SUGGESTED_PROMPTS = [
  'בדיקת זמינות',
  'מחיר ללילה',
  'מה כולל המתחם?',
  'פתח לי הזמנה',
]

function BrandAvatar({ size = 'md', ring = 'divider' }: { size?: 'sm' | 'md'; ring?: 'divider' | 'gold' | 'bone' }) {
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14'
  const ringClass =
    ring === 'gold' ? 'border-gold/70' : ring === 'bone' ? 'border-bone/30' : 'border-divider'
  return (
    <div className={`relative ${dim} shrink-0`}>
      <div className={`absolute inset-0 rounded-full border ${ringClass} bg-bone overflow-hidden flex items-center justify-center`}>
        <img src="/agent-logo.png" alt="" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}

export default function AgentChat({ compoundId, compoundName }: Props) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const [proposed, setProposed] = useState<ProposedBooking | null>(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [display, setDisplay] = useState<DisplayMessage[]>([
    {
      role: 'assistant',
      text: `שלום, אני העוזר של ${compoundName || 'המתחם'} — מכיר את החדרים, המחירים והסביבה. במה אפשר לעזור?`,
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  const initialValues: BookingInitialValues | undefined = proposed
    ? {
        compoundIds: [proposed.compoundId],
        roomIds: proposed.roomIds,
        checkIn: proposed.checkIn,
        checkOut: proposed.checkOut,
        adults: proposed.adults ?? proposed.guestsCount,
        children: proposed.children ?? 0,
        notes: proposed.notes,
      }
    : undefined

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [display, loading])

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    if (!overrideText) setInput('')
    setDisplay((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    const newHistory: Message[] = [...history, { role: 'user', content: text }]

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (auth.isAuthenticated) {
        try {
          const token = await auth.getValidToken()
          if (token) headers['Authorization'] = `Bearer ${token}`
        } catch {
          // No valid token - the server will treat as anonymous
        }
      }
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: newHistory, compoundId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setDisplay((prev) => [...prev, { role: 'assistant', text: data.error || 'שגיאה. נסה שוב.' }])
      } else {
        setHistory(data.messages)
        setDisplay((prev) => [...prev, { role: 'assistant', text: data.reply }])
        if (data.proposedBooking) {
          setProposed(data.proposedBooking)
        }
      }
    } catch {
      setDisplay((prev) => [...prev, { role: 'assistant', text: 'בעיית רשת. נסה שוב.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showChips = display.length === 1 && !loading

  return (
    <>
      {/* Floating bubble — editorial concierge */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="פתח צ'אט עם העוזר הוירטואלי"
          className="group fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-[60] flex items-center gap-3 bg-charcoal text-bone pr-2 pl-5 py-2 rounded-full shadow-[0_8px_24px_-8px_rgba(26,26,24,0.45)] hover:bg-charcoal-soft transition-all duration-300"
          dir="rtl"
        >
          <div className="relative w-12 h-12 shrink-0">
            <div className="absolute inset-0 rounded-full border border-gold/70 bg-bone overflow-hidden flex items-center justify-center">
              <img src="/agent-logo.png" alt="" className="w-full h-full object-contain" />
            </div>
            <span
              className="absolute bottom-0 right-0 w-2 h-2 bg-green-accent rounded-full ring-2 ring-charcoal"
              aria-hidden="true"
            />
          </div>
          <div className="text-right">
            <div className="font-editorial text-sm leading-none">העוזר</div>
            <div className="label-airy text-[9px] text-bone/55 leading-none mt-1">CONCIERGE</div>
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[60] flex flex-col overflow-hidden bg-bone border border-divider rounded-2xl shadow-[0_24px_48px_-16px_rgba(26,26,24,0.25)]
                     inset-x-4 bottom-24
                     sm:inset-x-auto sm:left-6 sm:right-auto sm:bottom-6 sm:w-[400px]
                     h-[520px] sm:h-[600px] max-h-[calc(100dvh-140px)]"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="צ'אט עם העוזר הוירטואלי"
        >
          {/* Top accent — thin gold rule */}
          <div className="h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />

          {/* Header */}
          <header className="flex items-center justify-between px-4 py-4 border-b border-divider/70 bg-bone">
            <div className="flex items-center gap-3">
              <div className="relative">
                <BrandAvatar size="md" ring="divider" />
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-accent rounded-full ring-2 ring-bone"
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col">
                <span className="label-airy text-[9px] text-muted leading-none mb-1.5">CONCIERGE</span>
                <h3 className="font-editorial text-charcoal leading-none text-base">העוזר</h3>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגור צ'אט"
              className="text-muted hover:text-charcoal transition-colors p-2 -m-2"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3.5 bg-bone">
            {display.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-[13.5px] leading-[1.55] whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-charcoal text-bone rounded-2xl rounded-br-md shadow-[0_1px_2px_rgba(26,26,24,0.15)]'
                      : 'bg-white text-charcoal rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(26,26,24,0.04)]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Suggested prompts — shown only on first message */}
            {showChips && (
              <div className="pt-2 pb-1">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="block w-5 h-px bg-gold/70" />
                  <span className="label-airy text-[9px] text-muted">הצעות</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => send(prompt)}
                      className="text-[12.5px] text-charcoal-soft bg-white border border-divider rounded-full px-3.5 py-1.5 hover:border-gold hover:text-charcoal hover:shadow-[0_2px_6px_rgba(181,165,138,0.18)] transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-end">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_1px_2px_rgba(26,26,24,0.04)]">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-muted/70 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 180}ms`, animationDuration: '1.2s' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sign CTA */}
          {proposed && !showSignModal && (
            <div className="border-t border-divider/70 bg-bone px-3 pt-3">
              <button
                onClick={() => setShowSignModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-green-accent text-bone text-sm font-medium py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <FileSignature className="w-4 h-4" aria-hidden="true" />
                המשך לחתימה
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-divider/70 bg-bone p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="שאל את העוזר..."
                rows={1}
                aria-label="הקלד הודעה לעוזר"
                className="flex-1 resize-none rounded-xl border border-divider bg-white px-3.5 py-2.5 text-[13.5px] text-charcoal placeholder:text-muted/60 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 max-h-24 transition-colors"
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="שלח הודעה"
                className="bg-charcoal text-bone rounded-xl p-2.5 hover:bg-charcoal-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking + signature modal, opened from the chat */}
      {showSignModal && proposed && (
        <BookingRequestModal
          initialValues={initialValues}
          onClose={() => setShowSignModal(false)}
          onSubmitted={() => {
            setShowSignModal(false)
            setProposed(null)
            setDisplay((prev) => [
              ...prev,
              {
                role: 'assistant',
                text: '🎉 ההזמנה נשלחה בהצלחה! החוזה נחתם ונשמר.\n\nאל תשכח להתקשר לבעל הבית כדי לתת פרטי כרטיס אשראי לביטחון - רק אז המקום מסומן בלעדית עבורך.',
              },
            ])
          }}
        />
      )}
    </>
  )
}
