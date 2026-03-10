import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link, useNavigate } from 'react-router-dom'
import logoImg from '../assets/1.jpg'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', manager_email: '' })
  const [managers, setManagers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/auth/managers').then(({ data }) => setManagers(data)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
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
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <select
            className="w-full border rounded px-3 py-2 text-gray-700 bg-white"
            value={form.manager_email}
            onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
          >
            <option value="">-- Select your manager (optional) --</option>
            {managers.map((m) => (
              <option key={m.id} value={m.email}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="Password (min 8 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
          <button className="btn-primary w-full" type="submit">Register</button>
        </form>
        <div className="text-xs text-gray-500 mt-3">
          Already have an account? <Link className="underline" to="/login">Login</Link>
        </div>
      </div>
    </div>
  )
}
