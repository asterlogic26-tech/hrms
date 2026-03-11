import { useAuth } from '../hooks/useAuth'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import api from '../services/api'

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
  const navigate = useNavigate()
  const title = PAGE_TITLES[location.pathname] || 'HRMS'
  const [pendingCount, setPendingCount] = useState(0)

  const canApprove = ['Manager', 'Team Lead', 'Founder'].includes(user?.role)

  useEffect(() => {
    if (!canApprove) return
    const fetch = () => api.get('/leaves/pending-count').then(r => setPendingCount(r.data.count)).catch(() => {})
    fetch()
    const timer = setInterval(fetch, 30000)
    return () => clearInterval(timer)
  }, [canApprove])

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
        {canApprove && (
          <button
            onClick={() => navigate('/leaves')}
            className="relative p-1.5 text-gray-500 hover:text-brand transition-colors"
            title="Pending leave requests"
          >
            <Bell size={18} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        )}
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
