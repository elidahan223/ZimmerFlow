import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './features/auth/AuthContext'
import Navbar from './layout/Navbar'
import BottomNav from './layout/BottomNav'
import Gallery from './features/gallery/Gallery'
import Calendar from './features/calendar/Calendar'
import Settings from './features/settings/Settings'
import Notifications from './features/notifications/Notifications'
import MyBookings from './features/booking/MyBookings'
import PaymentResult from './features/booking/PaymentResult'
import AuthModal from './features/auth/AuthModal'
import AgentChat from './features/agent/AgentChat'
import AccessibilityStatement from './features/accessibility/AccessibilityStatement'
import TermsOfUse from './features/legal/TermsOfUse'
import PrivacyPolicy from './features/legal/PrivacyPolicy'
import NotFound from './shared/NotFound'

export type View = 'gallery' | 'calendar' | 'settings' | 'notifications' | 'my-bookings' | 'accessibility' | 'terms' | 'privacy' | 'payment-success' | 'payment-failure' | 'not-found'

const KNOWN_PATHS = new Set(['/', '/accessibility', '/terms', '/privacy', '/payment/success', '/payment/failure'])

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

  // Resolve initial view from URL path
  useEffect(() => {
    const path = window.location.pathname
    const hash = window.location.hash
    if (path === '/accessibility' || hash === '#accessibility') {
      setView('accessibility')
    } else if (path === '/terms' || hash === '#terms') {
      setView('terms')
    } else if (path === '/privacy' || hash === '#privacy') {
      setView('privacy')
    } else if (path === '/payment/success') {
      setView('payment-success')
    } else if (path === '/payment/failure') {
      setView('payment-failure')
    } else if (!KNOWN_PATHS.has(path)) {
      setView('not-found')
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
    <div className="min-h-screen bg-bone">
      <Navbar transparentAtTop={view === 'gallery'} />
      <main id="main-content" style={{ paddingTop: 80 }} className="pb-32 sm:pb-6">
        {view === 'gallery' && <Gallery compoundId={selectedCompoundId} />}
        {view === 'calendar' && <Calendar />}
        {view === 'settings' && auth.isOwner && <Settings />}
        {view === 'notifications' && auth.isOwner && <Notifications />}
        {view === 'my-bookings' && auth.isAuthenticated && <MyBookings />}
        {view === 'accessibility' && <AccessibilityStatement />}
        {view === 'terms' && <TermsOfUse />}
        {view === 'privacy' && <PrivacyPolicy />}
        {view === 'payment-success' && (
          <PaymentResult
            outcome="success"
            onGoHome={() => { window.history.replaceState({}, '', '/'); setView('gallery') }}
            onGoMyBookings={() => { window.history.replaceState({}, '', '/'); setView('my-bookings') }}
          />
        )}
        {view === 'payment-failure' && (
          <PaymentResult
            outcome="failure"
            onGoHome={() => { window.history.replaceState({}, '', '/'); setView('gallery') }}
            onGoMyBookings={() => { window.history.replaceState({}, '', '/'); setView('my-bookings') }}
          />
        )}
        {view === 'not-found' && <NotFound onGoHome={() => { window.history.replaceState({}, '', '/'); setView('gallery') }} />}
        <footer className="mt-16 border-t border-divider py-6 px-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 label-airy text-[10px] text-charcoal-soft/50" dir="rtl">
          <button
            onClick={() => setView('accessibility')}
            className="hover:text-charcoal transition-colors"
          >
            הצהרת נגישות
          </button>
          <span className="text-muted" aria-hidden="true">·</span>
          <button
            onClick={() => setView('terms')}
            className="hover:text-charcoal transition-colors"
          >
            תקנון האתר
          </button>
          <span className="text-muted" aria-hidden="true">·</span>
          <button
            onClick={() => setView('privacy')}
            className="hover:text-charcoal transition-colors"
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
