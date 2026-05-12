import { useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthContext'
import { LogIn, LogOut, User } from 'lucide-react'

interface Props {
  transparentAtTop?: boolean
}

export default function Navbar({ transparentAtTop = false }: Props) {
  const auth = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Use transparent style only if the page wants it AND we're at the top
  const isTransparent = transparentAtTop && !scrolled

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-colors duration-300 ${
        isTransparent
          ? 'bg-transparent border-b border-transparent'
          : 'bg-bone/95 backdrop-blur-sm border-b border-divider'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        <img
          src="/logo.png"
          alt="בקתות הזהב"
          className={`h-12 sm:h-16 w-auto transition-all duration-300 ${
            !isTransparent ? '' : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
          }`}
        />

        <div className="flex items-center gap-3">
          <a
            href="tel:0546688566"
            className={`hidden sm:block text-sm transition-colors ${
              !isTransparent
                ? 'text-charcoal-soft/60 hover:text-charcoal'
                : 'text-bone/80 hover:text-bone drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
            }`}
            dir="ltr"
          >
            054-668-8566
          </a>

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className={`hidden sm:flex items-center gap-1.5 text-sm transition-colors ${
                !isTransparent ? 'text-charcoal-soft/70' : 'text-bone drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
              }`}>
                <User className="w-4 h-4" />
                {auth.profile?.firstName
                  ? `${auth.isOwner ? 'מנהל: ' : ''}${auth.profile.firstName}`
                  : auth.isOwner ? 'מנהל' : 'אורח'}
              </span>
              <button
                onClick={auth.logout}
                className={`flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-full ${
                  !isTransparent
                    ? 'text-charcoal-soft/60 hover:text-charcoal hover:bg-divider/50'
                    : 'text-bone hover:text-bone hover:bg-white/10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">יציאה</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => auth.setShowAuth('login')}
              className={`flex items-center gap-1.5 text-sm font-medium px-5 py-2 rounded-full transition-colors ${
                !isTransparent
                  ? 'bg-charcoal text-bone hover:bg-charcoal-soft'
                  : 'bg-bone/90 text-charcoal hover:bg-bone backdrop-blur-sm'
              }`}
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
