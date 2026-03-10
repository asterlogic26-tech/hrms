import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Trash2 } from 'lucide-react'

export default function Holidays() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ date: '', name: '', type: 'Holiday' })
  const isFounder = user?.role === 'Founder'

  const year = useMemo(() => new Date().getFullYear(), [])

  const load = async () => {
    try {
      const { data } = await api.get('/holidays', { params: { year: String(year) } })
      setRows(data)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load holidays')
    }
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
    return () => { cancelled = true }
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

  const remove = async (id) => {
    setError('')
    try {
      await api.delete(`/holidays/${id}`)
      await load()
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to delete holiday')
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5">
        {isFounder && (
          <div className="card p-5">
            <div className="font-semibold text-gray-800 mb-3">Add Holiday</div>
            <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">Date</div>
                <input
                  className="input-field"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1 font-medium">Name</div>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Diwali"
                  required
                />
              </div>
              <button className="btn-primary h-[38px]">Add Holiday</button>
            </form>
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          </div>
        )}

        <div className="card p-5">
          <div className="font-semibold text-gray-800 mb-3">Holidays ({year})</div>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          {rows.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">No holidays found for {year}.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  {isFounder && <th className="pb-3"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 text-gray-700">{h.date}</td>
                    <td className="py-3 font-medium text-gray-800">{h.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                        {h.type || 'Holiday'}
                      </span>
                    </td>
                    {isFounder && (
                      <td className="py-3 text-right">
                        <button
                          onClick={() => remove(h.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Delete holiday"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
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
