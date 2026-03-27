import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<{ needsConfirmation: boolean; phone: string }>
  confirmCode: (phone: string, code: string) => Promise<void>
  logout: () => void
  getValidToken: () => Promise<string>
  showAuth: 'login' | 'signup' | 'confirm' | null
  setShowAuth: (v: 'login' | 'signup' | 'confirm' | null) => void
  pendingPhone: string
  setPendingPhone: (v: string) => void
}

interface SignupData {
  firstName: string
  lastName: string
  email?: string
  phone: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [showAuth, setShowAuth] = useState<'login' | 'signup' | 'confirm' | null>(null)
  const [pendingPhone, setPendingPhone] = useState('')

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

  const login = async (phone: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    const userData: User = {
      userId: '',
      cognitoSub: '',
      accessToken: data.accessToken,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
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
      needsConfirmation: result.needsConfirmation,
      phone: data.phone,
    }
  }

  const confirmCode = async (phone: string, code: string) => {
    const res = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
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
        body: JSON.stringify({ refreshToken: user.refreshToken }),
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
    localStorage.removeItem('zimmerflow_auth')
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
      confirmCode,
      logout,
      getValidToken,
      showAuth,
      setShowAuth,
      pendingPhone,
      setPendingPhone,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
