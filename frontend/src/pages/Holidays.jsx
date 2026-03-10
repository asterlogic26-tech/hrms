import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function Holidays() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ date: '', name: '', type: 'Holiday' })
  const isFounder = user?.role === 'Founder'

  const year = useMemo(() => new Date().getFullYear(), [])

  const load = async () => {
    const { data } = await api.get('/holidays', { params: { year: String(year) } })
    setRows(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/holidays', { params: { year: String(year) } })
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load holidays')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/holidays', form)
      setForm({ date: '', name: '', type: 'Holiday' })
      await load()
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to add holiday')
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {isFounder ? (
          <div className="card p-4">
            <div className="font-semibold mb-2">Add Holiday</div>
            <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <div className="text-xs text-gray-500 mb-1">Date</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">Name</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Diwali"
                  required
                />
              </div>
              <button className="btn-primary">Add</button>
            </form>
            {error ? <div className="text-sm text-red-600 mt-2">{error}</div> : null}
          </div>
        ) : null}

        <div className="card p-4">
          <div className="font-semibold mb-2">Holidays ({year})</div>
          {error ? <div className="text-sm text-red-600 mb-2">{error}</div> : null}
          {rows.length === 0 ? (
            <div className="text-sm text-gray-500">No holidays found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Date</th>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="py-2">{h.date}</td>
                    <td>{h.name}</td>
                    <td>{h.type || 'Holiday'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}

