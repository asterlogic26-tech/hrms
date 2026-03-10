import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const STATUS_BADGE = {
  Approved: 'badge badge-green',
  Rejected: 'badge badge-red',
  Pending:  'badge badge-yellow',
}

export default function Leaves() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await api.get('/leaves')
    setLeaves(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/leaves')
        if (cancelled) return
        setLeaves(data)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load leaves')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const apply = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      await api.post('/leaves/apply', form)
      setForm({ start_date: '', end_date: '', reason: '' })
      setMsg('Leave applied successfully')
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Error')
    }
  }

  const approve = async (id, ok) => {
    try {
      await api.put('/leaves/approve', { leave_id: id, approve: ok })
      await load()
    } catch (e) {
      console.error(e)
      setError(e.response?.data?.message || 'Failed to update leave')
    }
  }

  const canApprove = ['Manager', 'Founder', 'Team Lead'].includes(user?.role)
  const pending = canApprove ? leaves.filter((l) => l.status === 'Pending') : []

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Apply leave form */}
        <div className="card p-5">
          <div className="font-semibold text-gray-800 mb-4">Apply Leave</div>
          <form onSubmit={apply} className="space-y-3">
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
            {error && <div className="text-sm text-red-600">{error}</div>}
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
    </Layout>
  )
}
