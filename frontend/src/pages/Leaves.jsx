import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

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

    return () => {
      cancelled = true
    }
  }, [])

  const apply = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      await api.post('/leaves/apply', form)
      setForm({ start_date: '', end_date: '', reason: '' })
      setMsg('Leave applied')
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

  const canApprove = ['Manager', 'Founder'].includes(user?.role)
  const pending = canApprove ? leaves.filter((l) => l.status === 'Pending') : []

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <div className="font-semibold mb-2">Apply Leave</div>
          <form onSubmit={apply} className="space-y-3">
            <input className="w-full border rounded px-3 py-2" type="date" value={form.start_date} onChange={e=>setForm({...form, start_date:e.target.value})} />
            <input className="w-full border rounded px-3 py-2" type="date" value={form.end_date} onChange={e=>setForm({...form, end_date:e.target.value})} />
            <input className="w-full border rounded px-3 py-2" placeholder="Reason" value={form.reason} onChange={e=>setForm({...form, reason:e.target.value})} />
            <button className="btn-primary">Apply</button>
            {msg ? <div className="text-sm text-gray-600">{msg}</div> : null}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </form>
        </div>
        <div className="lg:col-span-2 card p-4">
          <div className="font-semibold mb-2">
            {canApprove ? 'Leave Requests' : 'My Leaves'}
          </div>
          {canApprove ? (
            <div className="text-sm text-gray-600 mb-3">
              Pending approvals: <span className="font-semibold">{pending.length}</span>
            </div>
          ) : null}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Name</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="py-2">{l.name || user.name}</td>
                  <td>{l.start_date}</td>
                  <td>{l.end_date}</td>
                  <td>{l.status}</td>
                  <td className="space-x-2">
                    {canApprove && l.status === 'Pending' ? (
                      <>
                        <button onClick={()=>approve(l.id, true)} className="btn-primary">Approve</button>
                        <button onClick={()=>approve(l.id, false)} className="px-3 py-2 rounded bg-gray-800 text-white">Reject</button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
