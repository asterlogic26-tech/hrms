import { NavLink } from 'react-router-dom'
import { Users, CalendarCheck2, FileCheck2, LayoutDashboard, Settings, CalendarDays } from 'lucide-react'
import logoImg from '../assets/1.jpg'

export default function Sidebar({ role, user }) {
  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="h-full w-64 bg-brand flex flex-col shrink-0">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <img
          src={logoImg}
          alt="AsterLogic"
          className="h-9 w-9 rounded-lg object-cover shrink-0"
        />
        <div className="leading-tight">
          <div className="text-white font-bold text-sm">AsterLogic</div>
          <div className="text-white/50 text-[11px] font-medium tracking-widest uppercase">HRMS</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <Item to="/" label="Dashboard" icon={<LayoutDashboard size={17} />} end />
        <Item to="/attendance" label="Attendance" icon={<CalendarCheck2 size={17} />} />
        <Item to="/leaves" label="Leaves" icon={<FileCheck2 size={17} />} />
        <Item to="/holidays" label="Holidays" icon={<CalendarDays size={17} />} />
        <Item to="/employees" label="Employees" icon={<Users size={17} />} />
        {role === 'Founder' && (
          <Item to="/settings" label="Settings" icon={<Settings size={17} />} />
        )}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate leading-tight">{user.name}</div>
              <div className="text-white/45 text-[11px]">{user.role}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Item({ to, label, icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ' +
        (isActive
          ? 'bg-white/15 text-white font-medium'
          : 'text-white/65 hover:bg-white/10 hover:text-white')
      }
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
