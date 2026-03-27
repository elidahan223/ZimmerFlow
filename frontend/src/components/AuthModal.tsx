import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, Eye, EyeOff } from 'lucide-react'

export default function AuthModal() {
  const auth = useAuth()

  if (!auth.showAuth) return null

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={() => auth.setShowAuth(null)}
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {auth.showAuth === 'login' && <LoginForm />}
        {auth.showAuth === 'signup' && <SignupForm />}
        {auth.showAuth === 'confirm' && <ConfirmForm />}
      </div>
    </div>
  )
}

function LoginForm() {
  const auth = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.login(phone, password)
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-neutral-900 mb-1 text-center">התחברות</h2>
      <p className="text-neutral-400 text-sm text-center mb-8">הכנס את הפרטים שלך</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">טלפון</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="050-0000000"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">סיסמה</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass + ' pl-10'}
              placeholder="••••••••"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40"
        >
          {loading ? 'מתחבר...' : 'התחברות'}
        </button>
      </form>

      <p className="text-sm text-neutral-400 text-center mt-6">
        אין לך חשבון?{' '}
        <button
          onClick={() => auth.setShowAuth('signup')}
          className="text-neutral-900 font-medium hover:underline"
        >
          הרשמה
        </button>
      </p>
    </div>
  )
}

function SignupForm() {
  const auth = useAuth()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    idNumber: '',
    address: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await auth.signup(form)
      if (result.needsConfirmation) {
        auth.setPendingPhone(form.phone)
        auth.setShowAuth('confirm')
      } else {
        await auth.login(form.phone, form.password)
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה ברישום')
    } finally {
      setLoading(false)
    }
  }

  const set = (key: string, value: string) => setForm({ ...form, [key]: value })

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-neutral-900 mb-1 text-center">הרשמה</h2>
      <p className="text-neutral-400 text-sm text-center mb-8">מלאו את הפרטים כדי להירשם</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">שם פרטי *</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputClass}
              placeholder="שם פרטי"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">שם משפחה *</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputClass}
              placeholder="שם משפחה"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">טלפון *</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass}
            placeholder="050-0000000"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">סיסמה *</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className={inputClass + ' pl-10'}
              placeholder="לפחות 8 תווים"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">אימייל</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
            placeholder="your@email.com"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">תעודת זהות</label>
          <input
            type="text"
            value={form.idNumber}
            onChange={(e) => set('idNumber', e.target.value)}
            className={inputClass}
            placeholder="מספר תעודת זהות"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">כתובת מגורים</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            className={inputClass}
            placeholder="עיר, רחוב, מספר"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !form.firstName || !form.lastName || !form.phone || !form.password}
          className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40 mt-2"
        >
          {loading ? 'נרשם...' : 'הרשמה'}
        </button>
      </form>

      <p className="text-sm text-neutral-400 text-center mt-6">
        כבר יש לך חשבון?{' '}
        <button
          onClick={() => auth.setShowAuth('login')}
          className="text-neutral-900 font-medium hover:underline"
        >
          התחברות
        </button>
      </p>
    </div>
  )
}

function ConfirmForm() {
  const auth = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.confirmCode(auth.pendingPhone, code)
      auth.setShowAuth('login')
    } catch (err: any) {
      setError(err.message || 'שגיאה באימות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-neutral-900 mb-1 text-center">אימות טלפון</h2>
      <p className="text-neutral-400 text-sm text-center mb-8">
        הכנס את הקוד שנשלח ל-{auth.pendingPhone}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">קוד אימות</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass + ' text-center text-lg tracking-widest'}
            placeholder="000000"
            dir="ltr"
            maxLength={6}
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length < 4}
          className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40"
        >
          {loading ? 'מאמת...' : 'אימות'}
        </button>
      </form>
    </div>
  )
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 transition-all"
