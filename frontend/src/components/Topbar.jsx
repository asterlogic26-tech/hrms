import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/attendance': 'Attendance',
  '/leaves':     'Leave Management',
  '/holidays':   'Holidays',
  '/employees':  'Employees',
  '/settings':   'Settings',
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'HRMS'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div>
        <div className="font-semibold text-gray-800 text-sm leading-tight">{title}</div>
        <div className="text-[11px] text-gray-400">{today}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</div>
          <div className="text-[11px] text-gray-400">{user?.role}</div>
        </div>
        <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
