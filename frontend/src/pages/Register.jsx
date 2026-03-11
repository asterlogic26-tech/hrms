import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'
import logoImg from '../assets/1.jpg'
import { CheckCircle2 } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', manager_email: '' })
  const [managers, setManagers] = useState([])
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get('/auth/managers').then(({ data }) => setManagers(data)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/auth/register', form)
      setSubmitted(true)
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoImg} alt="AsterLogic" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <div className="text-xl font-bold text-gray-900">AsterLogic</div>
            <div className="text-xs text-gray-400 font-medium tracking-widest uppercase">HRMS</div>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
            </div>
            <div className="font-semibold text-gray-800 text-lg">Registration Submitted!</div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account request has been sent to the Founder for approval. You will be able to log in once your account is activated.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 font-medium">
              Please check back after receiving confirmation from your Founder.
            </div>
            <Link
              to="/login"
              className="btn-primary inline-block w-full text-center mt-2"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="font-semibold text-gray-700 mb-4">Create your account</div>
            <form onSubmit={submit} className="space-y-4">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Work email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                value={form.manager_email}
                onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
              >
                <option value="">— Select your reporting manager (optional) —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.name} · {m.role}
                  </option>
                ))}
              </select>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                type="password"
                placeholder="Password (min 8 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}
              <button className="btn-primary w-full" type="submit">Submit Registration</button>
            </form>
            <div className="text-xs text-gray-400 mt-3 text-center">
              Already have an account?{' '}
              <Link className="underline text-gray-600" to="/login">Log in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
