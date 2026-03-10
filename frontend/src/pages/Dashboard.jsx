import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import api from '../services/api'

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
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">
          Daily Report — <span className="text-blue-700">{date}</span>
        </h2>
        <button
          onClick={load}
          className="text-xs border border-gray-300 px-3 py-1 rounded hover:bg-gray-100 text-gray-600"
        >
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <SummaryCard label="Total" value={summary.total} color="text-gray-800" />
        <SummaryCard label="Present" value={summary.present} color="text-green-600" />
        <SummaryCard label="Working" value={summary.inProgress} color="text-blue-600" />
        <SummaryCard label="On Leave" value={summary.onLeave} color="text-yellow-600" />
        <SummaryCard label="Absent" value={summary.absent} color="text-red-500" />
        <SummaryCard label="Under 4 hrs" value={summary.underHours} color="text-orange-500" />
        <SummaryCard label="Pending Leaves" value={summary.pendingLeaves} color="text-purple-600" />
      </div>

      {/* Attendance table */}
      <div className="card p-4 mb-5">
        <div className="font-semibold mb-3">Employee Attendance</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Clock In</th>
                <th className="pb-2 pr-4">Clock Out</th>
                <th className="pb-2 pr-4">Hours</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">{e.name}</td>
                  <td className="pr-4 text-gray-500 text-xs">{e.role}</td>
                  <td className="pr-4">{fmtTime(e.clock_in)}</td>
                  <td className="pr-4">{fmtTime(e.clock_out)}</td>
                  <td className="pr-4">
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
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending leave requests */}
      <div className="card p-4">
        <div className="font-semibold mb-3">
          Pending Leave Requests
          {pendingLeaves.length > 0 && (
            <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingLeaves.length}
            </span>
          )}
        </div>
        {pendingLeaves.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-3">No pending requests</div>
        ) : (
          <div className="divide-y">
            {pendingLeaves.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="font-medium text-sm">{l.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{l.role}</span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {l.start_date} → {l.end_date}
                    {l.reason ? ` · ${l.reason}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleLeave(l.id, true)}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleLeave(l.id, false)}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Non-Founder: personal summary ────────────────────────────────────────────

function PersonalDashboard() {
  const [summary, setSummary] = useState({ totalEmployees: 0, presentToday: 0 })
  const [pending, setPending] = useState(0)

  useEffect(() => {
    api.get('/attendance/summary').then(r => setSummary(r.data)).catch(() => {})
    api.get('/leaves').then(r => {
      setPending(r.data.filter(x => x.status === 'Pending').length)
    }).catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card p-4">
        <div className="text-gray-500 text-sm">Total Employees</div>
        <div className="text-3xl font-semibold">{summary.totalEmployees}</div>
      </div>
      <div className="card p-4">
        <div className="text-gray-500 text-sm">Present Today</div>
        <div className="text-3xl font-semibold">{summary.presentToday}</div>
      </div>
      <div className="card p-4">
        <div className="text-gray-500 text-sm">My Pending Leaves</div>
        <div className="text-3xl font-semibold">{pending}</div>
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
    present:     { cls: 'bg-green-100 text-green-700',  label: 'Present' },
    in_progress: { cls: 'bg-blue-100 text-blue-700',    label: 'Working' },
    on_leave:    { cls: 'bg-yellow-100 text-yellow-700', label: 'On Leave' },
    absent:      { cls: 'bg-red-100 text-red-600',       label: 'Absent' },
  }
  const { cls, label } = cfg[status] || { cls: 'bg-gray-100 text-gray-500', label: status }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

function fmtTime(iso) {
  if (!iso) return '–'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
