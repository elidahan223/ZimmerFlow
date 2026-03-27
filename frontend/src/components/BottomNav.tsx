import { CalendarDays, Home } from 'lucide-react'
import type { View } from '../App'

interface Props {
  view: View
  setView: (v: View) => void
}

export default function BottomNav({ view, setView }: Props) {
  const tabs = [
    { id: 'gallery' as View, label: 'חדרים', icon: Home },
    { id: 'calendar' as View, label: 'לוח שנה', icon: CalendarDays },
  ]

  return (
    <>
      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 right-0 left-0 z-50 bg-white/95 backdrop-blur-sm border-t border-neutral-100 safe-area-bottom">
        <div className="flex">
          {tabs.map((tab) => {
            const active = view === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                <tab.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop top tabs (inside navbar area) */}
      <div className="hidden sm:flex fixed top-0 left-1/2 -translate-x-1/2 z-50 h-14 items-center gap-1">
        {tabs.map((tab) => {
          const active = view === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
