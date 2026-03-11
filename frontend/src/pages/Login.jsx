import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import logoImg from '../assets/1.jpg'
import { Clock3, Ban } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorCode('')
    try {
      setLoading(true)
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const data = err?.response?.data
      setErrorCode(data?.code || '')
      setError(data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
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

        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            errorCode === 'PENDING_APPROVAL' ? (
              <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Clock3 size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-amber-700">Awaiting Approval</div>
                  <div className="text-xs text-amber-600 mt-0.5">{error}</div>
                </div>
              </div>
            ) : errorCode === 'ACCOUNT_TERMINATED' ? (
              <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <Ban size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-700">Account Deactivated</div>
                  <div className="text-xs text-red-600 mt-0.5">{error}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )
          )}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <div className="text-xs text-gray-500 mt-3 text-center">
          New here?{' '}
          <Link className="underline text-gray-600" to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
