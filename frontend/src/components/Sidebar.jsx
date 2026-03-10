import { NavLink } from 'react-router-dom'
import { Users, CalendarCheck2, FileCheck2, LayoutDashboard, Settings } from 'lucide-react'

export default function Sidebar({ role }) {
  return (
    <div className="h-full w-64 bg-brand text-white flex flex-col">
      <div className="p-4 font-semibold text-xl flex items-center gap-2 border-b border-white/10">
        <div className="h-8 w-8 bg-white rounded" />
        <span>Asterlogic HRMS</span>
      </div>
      <nav className="p-3 space-y-1">
        <Item to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />
        <Item to="/attendance" label="Attendance" icon={<CalendarCheck2 size={18} />} />
        <Item to="/leaves" label="Leaves" icon={<FileCheck2 size={18} />} />
        <Item to="/employees" label="Employees" icon={<Users size={18} />} />
        {role === 'Founder' ? <Item to="/settings" label="Settings" icon={<Settings size={18} />} /> : null}
      </nav>
    </div>
  )
}

function Item({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'flex items-center gap-2 px-3 py-2 rounded-md ' + (isActive ? 'bg-white/10' : 'hover:bg-white/10')
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}
