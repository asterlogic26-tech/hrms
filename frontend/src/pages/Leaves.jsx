import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { CalendarDays, Stethoscope, Info } from 'lucide-react'

const STATUS_BADGE = {
  Approved: 'badge badge-green',
  Rejected: 'badge badge-red',
  Pending:  'badge badge-yellow',
}

const TYPE_BADGE = {
  Annual: 'bg-blue-50 text-blue-700',
  Sick:   'bg-purple-50 text-purple-700',
  Other:  'bg-gray-100 text-gray-600',
}

export default function Leaves() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [balance, setBalance] = useState(null)
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '', leave_type: 'Annual' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const isFounder = user?.role === 'Founder'

  const load = async () => {
    const { data } = await api.get('/leaves')
    setLeaves(data)
  }

  const loadBalance = async () => {
    if (isFounder) return
    try {
      const { data } = await api.get('/leaves/balance')
      setBalance(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const requests = [api.get('/leaves')]
        if (!isFounder) requests.push(api.get('/leaves/balance'))
        const results = await Promise.all(requests)
        if (cancelled) return
        setLeaves(results[0].data)
        if (!isFounder && results[1]) setBalance(results[1].data)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load leaves')
      }
    })()
    return () => { cancelled = true }
  }, [isFounder])

  const apply = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      await api.post('/leaves/apply', form)
      setForm({ start_date: '', end_date: '', reason: '', leave_type: 'Annual' })
      setMsg('Leave applied successfully')
      load()
      loadBalance()
    } catch (e) {
      setError(e.response?.data?.message || 'Error')
    }
  }

  const approve = async (id, ok) => {
    try {
      await api.put('/leaves/approve', { leave_id: id, approve: ok })
      await load()
      await loadBalance()
    } catch (e) {
      console.error(e)
      setError(e.response?.data?.message || 'Failed to update leave')
    }
  }

  const canApprove = ['Manager', 'Founder', 'Team Lead'].includes(user?.role)
  const pending = canApprove ? leaves.filter((l) => l.status === 'Pending') : []

  return (
    <Layout>
      <div className="space-y-5">

        {/* Leave balance cards — shown for every non-Founder employee */}
        {!isFounder && balance && (
          <LeaveBalanceBar balance={balance} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Apply leave form */}
          <div className="card p-5">
            <div className="font-semibold text-gray-800 mb-4">Apply Leave</div>
            <form onSubmit={apply} className="space-y-3">
              {/* Leave type */}
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1.5">Leave Type</div>
                <div className="flex gap-2">
                  {['Annual', 'Sick', 'Other'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, leave_type: t })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        form.leave_type === t
                          ? t === 'Annual' ? 'bg-blue-600 text-white border-blue-600'
                            : t === 'Sick' ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {!isFounder && balance && form.leave_type !== 'Other' && (
                  <div className="text-[11px] text-gray-400 mt-1.5">
                    {form.leave_type === 'Annual'
                      ? `${balance.annual.remaining} annual day(s) remaining`
                      : `${balance.sick.remaining} sick day(s) remaining`}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">From</div>
                <input
                  className="input-field"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">To</div>
                <input
                  className="input-field"
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">Reason</div>
                <input
                  className="input-field"
                  placeholder="e.g. Medical leave"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <button className="btn-primary w-full">Apply</button>
              {msg && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{msg}</div>}
              {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            </form>
          </div>

          {/* Leave list */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-gray-800">
                {canApprove ? 'Leave Requests' : 'My Leaves'}
              </div>
              {canApprove && pending.length > 0 && (
                <span className="badge badge-yellow">{pending.length} pending</span>
              )}
            </div>

            {leaves.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No leave records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Employee</th>
                      <th className="table-th">Type</th>
                      <th className="table-th">From</th>
                      <th className="table-th">To</th>
                      <th className="table-th">Reason</th>
                      <th className="table-th">Status</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l.id} className="table-row">
                        <td className="table-td font-medium text-gray-800">{l.name || user.name}</td>
                        <td className="table-td">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[l.leave_type] || TYPE_BADGE.Other}`}>
                            {l.leave_type || 'Annual'}
                          </span>
                        </td>
                        <td className="table-td">{l.start_date}</td>
                        <td className="table-td">{l.end_date}</td>
                        <td className="table-td text-gray-500">{l.reason || '—'}</td>
                        <td className="table-td">
                          <span className={STATUS_BADGE[l.status] || 'badge badge-gray'}>
                            {l.status}
                          </span>
                        </td>
                        <td className="table-td">
                          {canApprove && l.status === 'Pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => approve(l.id, true)}
                                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 font-medium transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => approve(l.id, false)}
                                className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

// ── Leave Balance Bar ──────────────────────────────────────────────────────────

function LeaveBalanceBar({ balance }) {
  const { annual, sick } = balance

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <BalanceCard
        icon={<CalendarDays size={20} />}
        label="Annual Leave"
        total={annual.total}
        used={annual.used}
        remaining={annual.remaining}
        color={{ border: 'border-blue-500', bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' }}
        renewNote="Renews every January"
      />
      <BalanceCard
        icon={<Stethoscope size={20} />}
        label="Sick Leave"
        total={sick.total}
        used={sick.used}
        remaining={sick.remaining}
        color={{ border: 'border-purple-500', bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' }}
        renewNote="Renews every January"
      />
    </div>
  )
}

function BalanceCard({ icon, label, total, used, remaining, color, renewNote }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const isLow = remaining <= 1

  return (
    <div className={`card p-5 border-l-4 ${color.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-lg ${color.bg} flex items-center justify-center ${color.icon} shrink-0`}>
            {icon}
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">{label}</div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Info size={10} />
              {renewNote}
            </div>
          </div>
        </div>
        {isLow && remaining === 0 ? (
          <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Exhausted</span>
        ) : isLow ? (
          <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Low</span>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? 'bg-red-400' : color.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Stat label="Total"     value={total}     cls="text-gray-700" />
          <Stat label="Used"      value={used}       cls="text-orange-600" />
          <Stat label="Remaining" value={remaining}  cls={remaining === 0 ? 'text-red-600' : color.text} />
        </div>
        <div className={`text-2xl font-bold ${remaining === 0 ? 'text-red-500' : color.text}`}>
          {remaining}<span className="text-sm font-normal text-gray-400 ml-0.5">d</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, cls }) {
  return (
    <div className="text-center">
      <div className={`text-base font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
  )
}
