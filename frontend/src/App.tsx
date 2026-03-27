import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Gallery from './components/Gallery'
import Calendar from './components/Calendar'
import BottomNav from './components/BottomNav'
import AuthModal from './components/AuthModal'

export type View = 'gallery' | 'calendar'

function App() {
  const auth = useAuth()
  const [view, setView] = useState<View>('gallery')

  // Strip old Cognito callback params from URL
  useEffect(() => {
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (auth.isLoading) return null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16 pb-20 sm:pb-6 overflow-y-auto">
        {view === 'gallery' && <Gallery />}
        {view === 'calendar' && <Calendar />}
      </main>
      <BottomNav view={view} setView={setView} />
      <AuthModal />
    </div>
  )
}

export default App
