import { useAuth } from '../context/AuthContext'
import { LogIn, LogOut, User } from 'lucide-react'

export default function Navbar() {
  const auth = useAuth()

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-neutral-800">
          ZimmerFlow
        </span>

        <div className="flex items-center gap-3">
          <a
            href="tel:054-123-4567"
            className="hidden sm:block text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            054-123-4567
          </a>

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-neutral-600">
                <User className="w-4 h-4" />
                מנהל
              </span>
              <button
                onClick={auth.logout}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors px-3 py-1.5 rounded-full hover:bg-neutral-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => auth.setShowAuth('login')}
              className="flex items-center gap-1.5 bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-neutral-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              התחברות
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
