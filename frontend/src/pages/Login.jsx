import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch (e) {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-brand rounded" />
          <div className="text-2xl font-semibold">Asterlogic HRMS</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
          <button className="btn-primary w-full" type="submit">Login</button>
        </form>
        <div className="text-xs text-gray-500 mt-3">New here? <Link className="underline" to="/register">Create an account</Link></div>
      </div>
    </div>
  )
}
