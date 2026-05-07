import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, FileSignature } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BookingRequestModal, { type BookingInitialValues } from './BookingRequestModal'

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
      text: `שלום! 👋 אני הסוכן הוירטואלי של${compoundName ? ' ' + compoundName : ' המתחם'}. אני יכול לעזור לך לבדוק זמינות, להבין על המקום ולפתוח הזמנה. במה אוכל לעזור?`,
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

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
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

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 sm:bottom-6 left-6 z-[60] bg-neutral-900 text-white rounded-full p-4 shadow-xl hover:bg-neutral-700 transition-all hover:scale-105"
          aria-label="פתח צ'אט"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 left-6 right-6 sm:right-auto sm:w-96 z-[60] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col"
          style={{ maxHeight: 'min(600px, calc(100vh - 100px))', height: '600px' }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div>
              <h3 className="font-bold text-neutral-900">סוכן וירטואלי</h3>
              <p className="text-xs text-neutral-400">בודק זמינות ופותח הזמנה</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {display.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-neutral-900 text-white rounded-br-sm'
                      : 'bg-neutral-100 text-neutral-800 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                </div>
              </div>
            )}
          </div>

          {/* Sign CTA - appears after agent calls propose_booking */}
          {proposed && !showSignModal && (
            <div className="border-t border-neutral-100 px-3 pt-3">
              <button
                onClick={() => setShowSignModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <FileSignature className="w-4 h-4" />
                המשך לחתימה
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-neutral-100 p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="כתוב הודעה..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 max-h-24"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-neutral-900 text-white rounded-xl p-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
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
