import { useEffect, useState } from 'react'
import { CalendarDays, Home, Settings, Bell, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { View, CompoundTab } from '../App'

interface Props {
  view: View
  setView: (v: View) => void
  compounds: CompoundTab[]
  selectedCompoundId: string | null
  onSelectCompound: (id: string) => void
}

export default function BottomNav({ view, setView, compounds, selectedCompoundId, onSelectCompound }: Props) {
  const auth = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  // Poll pending bookings count for owner (every 30s)
  useEffect(() => {
    if (!auth.isOwner) {
      setPendingCount(0)
      return
    }
    let cancelled = false
    async function check() {
      try {
        const token = await auth.getValidToken()
        const res = await fetch('/api/bookings/pending', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setPendingCount(Array.isArray(data) ? data.length : 0)
      } catch {}
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [auth.isOwner, view])

  const compoundTabs = compounds.map((c) => ({
    id: c.id,
    label: c.name,
    icon: Home,
    type: 'compound' as const,
    badge: 0,
  }))

  const otherTabs = [
    { id: 'calendar', label: 'לוח שנה', icon: CalendarDays, type: 'view' as const, badge: 0 },
    ...(auth.isAuthenticated && !auth.isOwner ? [{ id: 'my-bookings', label: 'ההזמנות שלי', icon: FileText, type: 'view' as const, badge: 0 }] : []),
    ...(auth.isOwner ? [{ id: 'notifications', label: 'התראות', icon: Bell, type: 'view' as const, badge: pendingCount }] : []),
    ...(auth.isOwner ? [{ id: 'settings', label: 'הגדרות', icon: Settings, type: 'view' as const, badge: 0 }] : []),
  ]

  const allTabs = [...compoundTabs, ...otherTabs]

  function handleClick(tab: typeof allTabs[number]) {
    if (tab.type === 'compound') {
      onSelectCompound(tab.id)
    } else {
      setView(tab.id as View)
    }
  }

  function isActive(tab: typeof allTabs[number]) {
    if (tab.type === 'compound') {
      return view === 'gallery' && selectedCompoundId === tab.id
    }
    return view === tab.id
  }

  return (
    <>
      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 right-0 left-0 z-50 bg-white/95 backdrop-blur-sm border-t border-neutral-100 safe-area-bottom">
        <div className="flex overflow-x-auto no-scrollbar">
          {allTabs.map((tab) => {
            const active = isActive(tab)
            return (
              <button
                key={tab.id}
                onClick={() => handleClick(tab)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors relative ${
                  active ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                <div className="relative">
                  <tab.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.5} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate max-w-full">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop top tabs (inside navbar area) */}
      <div className="hidden sm:flex fixed top-0 left-1/2 -translate-x-1/2 z-50 h-14 items-center gap-1">
        {allTabs.map((tab) => {
          const active = isActive(tab)
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap relative ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
