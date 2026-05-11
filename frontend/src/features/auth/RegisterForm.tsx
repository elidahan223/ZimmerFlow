import { useState } from 'react'
import { useAuth } from 'react-oidc-context'

interface Props {
  onComplete: () => void
}

export default function RegisterForm({ onComplete }: Props) {
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: auth.user?.profile?.email || '',
    phone: '',
    idNumber: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName) return

    setLoading(true)
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.user?.access_token}`,
        },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        onComplete()
      }
    } catch {
      alert('שגיאה בשמירת הפרטים')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 transition-all"

  return (
    <div className="fixed inset-0 z-[90] bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-neutral-900 mb-1 text-center">השלמת רישום</h2>
        <p className="text-neutral-400 text-sm text-center mb-8">מלאו את הפרטים כדי להמשיך</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">שם פרטי *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
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
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputClass}
                placeholder="שם משפחה"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">אימייל</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">טלפון</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="050-0000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">תעודת זהות</label>
            <input
              type="text"
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
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
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass}
              placeholder="עיר, רחוב, מספר"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.firstName || !form.lastName}
            className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40 mt-2"
          >
            {loading ? 'שומר...' : 'שמירה והמשך'}
          </button>
        </form>
      </div>
    </div>
  )
}
