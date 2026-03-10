import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import api from '../services/api'
import { CalendarCheck2, Users, Clock, FileCheck2 } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <Layout>
      {user?.role === 'Founder' ? <FounderDashboard /> : <PersonalDashboard />}
    </Layout>
  )
}

// ── Founder: full daily report ────────────────────────────────────────────────

function FounderDashboard() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/attendance/daily-report')
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleLeave = async (leave_id, approve) => {
    await api.put('/leaves/approve', { leave_id, approve }).catch(() => {})
    load()
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading report…</div>
  if (!report) return <div className="py-12 text-center text-red-400">Failed to load report.</div>

  const { date, summary, employees, pendingLeaves } = report

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Daily Report</div>
          <div className="font-semibold text-gray-800">{date}</div>
        </div>
        <button onClick={load} className="btn-secondary text-xs py-1.5">Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <SummaryCard label="Total" value={summary.total} color="text-gray-800" />
        <SummaryCard label="Present" value={summary.present} color="text-green-600" />
        <SummaryCard label="Working" value={summary.inProgress} color="text-blue-600" />
        <SummaryCard label="On Leave" value={summary.onLeave} color="text-yellow-600" />
        <SummaryCard label="Absent" value={summary.absent} color="text-red-500" />
        <SummaryCard label="Under 4 hrs" value={summary.underHours} color="text-orange-500" />
        <SummaryCard label="Pending Leaves" value={summary.pendingLeaves} color="text-purple-600" />
      </div>

      {/* Attendance table */}
      <div className="card p-5 mb-5">
        <div className="font-semibold text-gray-800 mb-3">Employee Attendance</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Name</th>
                <th className="table-th">Role</th>
                <th className="table-th">Clock In</th>
                <th className="table-th">Clock Out</th>
                <th className="table-th">Hours</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-td font-medium text-gray-800">{e.name}</td>
                  <td className="table-td text-gray-400 text-xs">{e.role}</td>
                  <td className="table-td">{fmtTime(e.clock_in)}</td>
                  <td className="table-td">{fmtTime(e.clock_out)}</td>
                  <td className="table-td">
                    {e.hoursWorked !== null ? (
                      <span className={
                        e.underHours
                          ? (e.status === 'in_progress' ? 'text-orange-500 font-medium' : 'text-red-600 font-medium')
                          : 'text-green-700 font-medium'
                      }>
                        {e.hoursWorked.toFixed(1)}h
                        {e.underHours && e.status === 'in_progress' ? ' ⏳' : ''}
                        {e.underHours && e.status === 'present' ? ' ⚠' : ''}
                      </span>
                    ) : '–'}
                  </td>
                  <td className="table-td"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending leave requests */}
      <div className="card p-5">
        <div className="font-semibold text-gray-800 mb-3">
          Pending Leave Requests
          {pendingLeaves.length > 0 && (
            <span className="ml-2 badge badge-yellow">{pendingLeaves.length}</span>
          )}
        </div>
        {pendingLeaves.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No pending requests</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pendingLeaves.map(l => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium text-sm text-gray-800">{l.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{l.role}</span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {l.start_date} → {l.end_date}
                    {l.reason ? ` · ${l.reason}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => handleLeave(l.id, true)} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">Approve</button>
                  <button onClick={() => handleLeave(l.id, false)} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Non-Founder: personal dashboard ──────────────────────────────────────────

function PersonalDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState({ totalEmployees: 0, presentToday: 0 })
  const [myAttendance, setMyAttendance] = useState([])
  const [leaves, setLeaves] = useState([])
  const [holidays, setHolidays] = useState([])

  useEffect(() => {
    api.get('/attendance/summary').then(r => setSummary(r.data)).catch(() => {})
    api.get('/attendance/my-attendance').then(r => setMyAttendance(r.data)).catch(() => {})
    api.get('/leaves').then(r => setLeaves(r.data)).catch(() => {})
    api.get('/holidays').then(r => setHolidays(r.data)).catch(() => {})
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const todayRecord = myAttendance.find(r => r.date === today)

  const myPendingLeaves = leaves.filter(l => l.status === 'Pending').length
  const canApprove = ['Manager', 'Team Lead'].includes(user?.role)
  const pendingApprovals = canApprove ? leaves.filter(l => l.status === 'Pending').length : 0
  const leavesThisMonth = leaves.filter(l => l.start_date.startsWith(thisMonth)).length

  const hoursToday = todayRecord?.clock_in && todayRecord?.clock_out
    ? ((new Date(todayRecord.clock_out) - new Date(todayRecord.clock_in)) / 3600000).toFixed(1)
    : null

  const upcomingHolidays = holidays.filter(h => h.date >= today).slice(0, 5)
  const recent = myAttendance.slice(0, 7)

  const statCards = [
    { label: 'Total Employees', value: summary.totalEmployees, icon: <Users size={20} />, color: 'text-brand', bg: 'bg-blue-50' },
    { label: 'Present Today', value: summary.presentToday, icon: <CalendarCheck2 size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
    canApprove
      ? { label: 'Pending Approvals', value: pendingApprovals, icon: <FileCheck2 size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' }
      : { label: 'Leaves This Month', value: leavesThisMonth, icon: <FileCheck2 size={20} />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'My Pending Leaves', value: myPendingLeaves, icon: <Clock size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
              {s.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today + Recent attendance */}
        <div className="md:col-span-2 space-y-4">
          {/* Today's status */}
          <div className="card p-5">
            <div className="font-semibold text-gray-800 mb-4">Today's Attendance</div>
            {todayRecord ? (
              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Clock In</div>
                  <div className="text-2xl font-bold text-green-600">{fmtTime(todayRecord.clock_in)}</div>
                </div>
                {todayRecord.clock_out ? (
                  <>
                    <div className="text-2xl text-gray-200">›</div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Clock Out</div>
                      <div className="text-2xl font-bold text-red-500">{fmtTime(todayRecord.clock_out)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Hours Worked</div>
                      <div className={`text-2xl font-bold ${parseFloat(hoursToday) < 4 ? 'text-orange-500' : 'text-brand'}`}>
                        {hoursToday}h
                      </div>
                    </div>
                    <span className="badge badge-green self-center">Completed</span>
                  </>
                ) : (
                  <span className="badge badge-blue self-center text-sm px-3 py-1">Currently Working</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-gray-400 py-2">
                <CalendarCheck2 size={18} className="text-gray-300" />
                Not clocked in yet today. Go to <a href="/attendance" className="text-brand underline">Attendance</a> to clock in.
              </div>
            )}
          </div>

          {/* Recent attendance */}
          <div className="card p-5">
            <div className="font-semibold text-gray-800 mb-3">Recent Attendance</div>
            {recent.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No attendance records yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Date</th>
                    <th className="table-th">Clock In</th>
                    <th className="table-th">Clock Out</th>
                    <th className="table-th">Hours</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => {
                    const hrs = r.clock_in && r.clock_out
                      ? ((new Date(r.clock_out) - new Date(r.clock_in)) / 3600000).toFixed(1)
                      : null
                    return (
                      <tr key={r.date} className="table-row">
                        <td className="table-td font-medium">{r.date}</td>
                        <td className="table-td">{fmtTime(r.clock_in)}</td>
                        <td className="table-td">{fmtTime(r.clock_out)}</td>
                        <td className="table-td">
                          {hrs ? (
                            <span className={parseFloat(hrs) < 4 ? 'text-orange-500 font-medium' : 'text-green-700 font-medium'}>
                              {hrs}h
                            </span>
                          ) : '–'}
                        </td>
                        <td className="table-td">
                          <span className={`badge ${r.clock_out ? 'badge-green' : r.clock_in ? 'badge-blue' : 'badge-gray'}`}>
                            {r.clock_out ? 'Done' : r.clock_in ? 'Working' : r.status || 'Absent'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming holidays */}
        <div className="card p-5 h-fit">
          <div className="font-semibold text-gray-800 mb-4">Upcoming Holidays</div>
          {upcomingHolidays.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">No upcoming holidays.</div>
          ) : (
            <div className="space-y-3">
              {upcomingHolidays.map(h => (
                <div key={h.id} className="flex gap-3 items-start pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="bg-red-50 text-red-500 font-bold rounded-lg px-2.5 py-1.5 text-center min-w-[48px] shrink-0">
                    <div className="text-xl leading-none">{new Date(h.date).getDate()}</div>
                    <div className="uppercase text-[10px] mt-0.5 font-semibold">
                      {new Date(h.date).toLocaleString('default', { month: 'short' })}
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.date).toLocaleString('default', { weekday: 'long' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }) {
  return (
    <div className="card p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    present:     { cls: 'badge-green',  label: 'Present' },
    in_progress: { cls: 'badge-blue',   label: 'Working' },
    on_leave:    { cls: 'badge-yellow', label: 'On Leave' },
    absent:      { cls: 'badge-red',    label: 'Absent' },
  }
  const { cls, label } = cfg[status] || { cls: 'badge-gray', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}

function fmtTime(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
