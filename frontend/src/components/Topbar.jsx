import { useAuth } from '../hooks/useAuth'

export default function Topbar() {
  const { user, logout } = useAuth()
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="font-semibold">{user ? `Welcome, ${user.name}` : ''}</div>
      <button className="btn-primary" onClick={logout}>Logout</button>
    </div>
  )
}
