import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Gallery from './components/Gallery'
import Calendar from './components/Calendar'
import Settings from './components/Settings'
import BottomNav from './components/BottomNav'
import AuthModal from './components/AuthModal'

export type View = 'gallery' | 'calendar' | 'settings'

function App() {
  const auth = useAuth()
  const [view, setView] = useState<View>('gallery')
  const [compoundName, setCompoundName] = useState('')

  // Load compound name for nav
  useEffect(() => {
    fetch('/api/compounds')
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) setCompoundName(data[0].name)
      })
      .catch(() => {})
  }, [])

  // Strip old Cognito callback params from URL
  useEffect(() => {
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Reset to gallery if logged out while on settings
  useEffect(() => {
    if (!auth.isAuthenticated && view === 'settings') {
      setView('gallery')
    }
  }, [auth.isAuthenticated, view])

  if (auth.isLoading) return null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16 pb-20 sm:pb-6 overflow-y-auto">
        {view === 'gallery' && <Gallery />}
        {view === 'calendar' && <Calendar />}
        {view === 'settings' && auth.isAuthenticated && <Settings />}
      </main>
      <BottomNav view={view} setView={setView} compoundName={compoundName} />
      <AuthModal />
    </div>
  )
}

export default App
