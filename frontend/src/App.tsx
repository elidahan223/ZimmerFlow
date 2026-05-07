import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Gallery from './components/Gallery'
import Calendar from './components/Calendar'
import Settings from './components/Settings'
import Notifications from './components/Notifications'
import MyBookings from './components/MyBookings'
import BottomNav from './components/BottomNav'
import AuthModal from './components/AuthModal'
import AgentChat from './components/AgentChat'

export type View = 'gallery' | 'calendar' | 'settings' | 'notifications' | 'my-bookings'

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
      <main style={{ paddingTop: 80 }} className="pb-20 sm:pb-6">
        {view === 'gallery' && <Gallery compoundId={selectedCompoundId} />}
        {view === 'calendar' && <Calendar />}
        {view === 'settings' && auth.isOwner && <Settings />}
        {view === 'notifications' && auth.isOwner && <Notifications />}
        {view === 'my-bookings' && auth.isAuthenticated && <MyBookings />}
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
