import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const ROLES = ['Employee', 'Team Lead', 'Manager', 'Founder']

const roleColor = {
  Founder:    'text-purple-600',
  Manager:    'text-blue-600',
  'Team Lead':'text-indigo-500',
  Employee:   'text-gray-600',
}

export default function Employees() {
  const { user } = useAuth()
  const isFounder = user?.role === 'Founder'
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState({})
  const [msg, setMsg] = useState('')

  const load = () => api.get('/employees').then(r => setRows(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const changeRole = async (id, role) => {
    setSaving(s => ({ ...s, [id]: true }))
    setMsg('')
    try {
      await api.patch(`/employees/${id}/role`, { role })
      setMsg('Role updated.')
      load()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to update role')
    } finally {
      setSaving(s => ({ ...s, [id]: false }))
    }
  }

  return (
    <Layout>
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-semibold">Employee Directory</div>
          {isFounder && <div className="text-xs text-gray-400">As Founder you can change any user's role</div>}
        </div>
        {msg && <div className="text-sm text-blue-600 mb-2">{msg}</div>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Manager</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id} className="border-t">
                <td className="py-2 font-medium">{x.name}</td>
                <td>
                  {isFounder && x.email !== user.email ? (
                    <select
                      className="border rounded px-2 py-1 text-xs bg-white"
                      value={x.role}
                      disabled={saving[x.id]}
                      onChange={e => changeRole(x.id, e.target.value)}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`font-medium ${roleColor[x.role] || ''}`}>{x.role}</span>
                  )}
                </td>
                <td className="text-gray-500">{x.email}</td>
                <td>{x.manager_name || '-'}</td>
                <td>{x.department || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
