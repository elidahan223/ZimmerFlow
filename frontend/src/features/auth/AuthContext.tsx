import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface User {
  userId: string
  cognitoSub: string
  accessToken: string
  idToken: string
  refreshToken: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export type Role = 'ADMIN' | 'OWNER' | 'GUEST'

export interface Profile {
  id: string
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string
  idNumber?: string | null
  address?: string | null
  role: Role
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isAuthenticated: boolean
  isOwner: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<{ needsConfirmation: boolean; email: string }>
  confirmCode: (email: string, code: string) => Promise<void>
  logout: () => void
  getValidToken: () => Promise<string>
  refreshProfile: () => Promise<void>
  showAuth: 'login' | 'signup' | 'confirm' | null
  setShowAuth: (v: 'login' | 'signup' | 'confirm' | null) => void
  pendingEmail: string
  setPendingEmail: (v: string) => void
}

interface SignupData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  idNumber?: string
  address?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuth, setShowAuth] = useState<'login' | 'signup' | 'confirm' | null>(null)
  const [pendingEmail, setPendingEmail] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('zimmerflow_auth')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('zimmerflow_auth')
      }
    }
    setIsLoading(false)
  }, [])

  // Load profile (with role) whenever we have a user
  useEffect(() => {
    if (!user?.accessToken) {
      setProfile(null)
      return
    }
    fetchProfile()
  }, [user?.accessToken])

  async function fetchProfile() {
    try {
      const token = await getValidToken()
      if (!token) return
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setProfile(await res.json())
      }
    } catch {}
  }

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    const userData: User = {
      userId: '',
      cognitoSub: '',
      accessToken: data.accessToken,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      email: email.trim().toLowerCase(),
    }
    setUser(userData)
    localStorage.setItem('zimmerflow_auth', JSON.stringify(userData))
    setShowAuth(null)
  }

  const signup = async (data: SignupData) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)

    return {
      needsConfirmation: !!result.needsConfirmation,
      email: data.email,
    }
  }

  const confirmCode = async (email: string, code: string) => {
    const res = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
  }

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!user?.refreshToken) return null
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: user.refreshToken, email: user.email }),
      })
      if (!res.ok) {
        logout()
        return null
      }
      const data = await res.json()
      const updated = { ...user, accessToken: data.accessToken, idToken: data.idToken }
      setUser(updated)
      localStorage.setItem('zimmerflow_auth', JSON.stringify(updated))
      return data.accessToken
    } catch {
      logout()
      return null
    }
  }

  const getValidToken = async (): Promise<string> => {
    if (!user?.accessToken) return ''
    // Check if token is about to expire (decode JWT exp)
    try {
      const payload = JSON.parse(atob(user.accessToken.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp - now < 300) {
        // Less than 5 minutes left, refresh
        const newToken = await refreshAccessToken()
        return newToken || ''
      }
    } catch {
      // If decode fails, try refresh
      const newToken = await refreshAccessToken()
      return newToken || ''
    }
    return user.accessToken
  }

  const logout = () => {
    setUser(null)
    setProfile(null)
    localStorage.removeItem('zimmerflow_auth')
  }

  const isOwner = profile?.role === 'OWNER' || profile?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated: !!user,
      isOwner,
      isLoading,
      login,
      signup,
      confirmCode,
      logout,
      getValidToken,
      refreshProfile: fetchProfile,
      showAuth,
      setShowAuth,
      pendingEmail,
      setPendingEmail,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
