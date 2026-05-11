import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './features/auth/AuthContext'
import Navbar from './layout/Navbar'
import BottomNav from './layout/BottomNav'
import Gallery from './features/gallery/Gallery'
import Calendar from './features/calendar/Calendar'
import Settings from './features/settings/Settings'
import Notifications from './features/notifications/Notifications'
import MyBookings from './features/booking/MyBookings'
import AuthModal from './features/auth/AuthModal'
import AgentChat from './features/agent/AgentChat'
import AccessibilityStatement from './features/accessibility/AccessibilityStatement'
import TermsOfUse from './features/legal/TermsOfUse'
import PrivacyPolicy from './features/legal/PrivacyPolicy'

export type View = 'gallery' | 'calendar' | 'settings' | 'notifications' | 'my-bookings' | 'accessibility' | 'terms' | 'privacy'

export interface CompoundTab {
  id: string
  name: string
}

function App() {
  const auth = useAuth()
  const [view, setView] = useState<View>('gallery')
  const [compounds, setCompounds] = useState<CompoundTab[]>([])
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null)

  const fetchCompounds = useCallback(() => {
    fetch('/api/compounds')
      .then((r) => r.json())
      .then((data: CompoundTab[]) => {
        setCompounds(data)
        if (data.length > 0 && !selectedCompoundId) {
          setSelectedCompoundId(data[0].id)
        }
      })
      .catch(() => {})
  }, [selectedCompoundId])

  useEffect(() => {
    fetchCompounds()
  }, [])

  // Refresh compounds list when coming back from settings
  useEffect(() => {
    if (view === 'gallery') {
      fetchCompounds()
    }
  }, [view])

  // Strip old Cognito callback params from URL
  useEffect(() => {
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Open accessibility statement when URL is /accessibility (e.g. from UserWay widget link)
  useEffect(() => {
    if (window.location.pathname === '/accessibility' || window.location.hash === '#accessibility') {
      setView('accessibility')
    }
    if (window.location.pathname === '/terms' || window.location.hash === '#terms') {
      setView('terms')
    }
    if (window.location.pathname === '/privacy' || window.location.hash === '#privacy') {
      setView('privacy')
    }
  }, [])

  // Gate admin-only views
  useEffect(() => {
    if ((view === 'settings' || view === 'notifications') && !auth.isOwner) {
      setView('gallery')
    }
    if (view === 'my-bookings' && !auth.isAuthenticated) {
      setView('gallery')
    }
  }, [auth.isOwner, auth.isAuthenticated, view])

  function handleSelectCompound(id: string) {
    setSelectedCompoundId(id)
    setView('gallery')
  }

  if (auth.isLoading) return null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main id="main-content" style={{ paddingTop: 80 }} className="pb-32 sm:pb-6">
        {view === 'gallery' && <Gallery compoundId={selectedCompoundId} />}
        {view === 'calendar' && <Calendar />}
        {view === 'settings' && auth.isOwner && <Settings />}
        {view === 'notifications' && auth.isOwner && <Notifications />}
        {view === 'my-bookings' && auth.isAuthenticated && <MyBookings />}
        {view === 'accessibility' && <AccessibilityStatement />}
        {view === 'terms' && <TermsOfUse />}
        {view === 'privacy' && <PrivacyPolicy />}
        <footer className="mt-8 border-t border-neutral-100 py-4 px-4 text-center text-xs text-neutral-400 flex flex-wrap justify-center gap-x-4 gap-y-2" dir="rtl">
          <button
            onClick={() => setView('accessibility')}
            className="hover:text-neutral-700 transition-colors underline-offset-2 hover:underline"
          >
            הצהרת נגישות
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setView('terms')}
            className="hover:text-neutral-700 transition-colors underline-offset-2 hover:underline"
          >
            תקנון האתר
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setView('privacy')}
            className="hover:text-neutral-700 transition-colors underline-offset-2 hover:underline"
          >
            מדיניות פרטיות
          </button>
        </footer>
      </main>
      <BottomNav
        view={view}
        setView={setView}
        compounds={compounds}
        selectedCompoundId={selectedCompoundId}
        onSelectCompound={handleSelectCompound}
      />
      <AuthModal />
      {view === 'gallery' && selectedCompoundId && !auth.isOwner && (
        <AgentChat
          compoundId={selectedCompoundId}
          compoundName={compounds.find((c) => c.id === selectedCompoundId)?.name}
        />
      )}
    </div>
  )
}

export default App
