import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { UserX, UserCheck, UserMinus, Users, Clock3, ChevronDown, AlertTriangle } from 'lucide-react'

const ROLES = ['Employee', 'Team Lead', 'Manager', 'Founder']

const roleColor = {
  Founder:     'text-purple-700 bg-purple-50',
  Manager:     'text-blue-700 bg-blue-50',
  'Team Lead': 'text-indigo-600 bg-indigo-50',
  Employee:    'text-gray-600 bg-gray-100',
}

export default function Employees() {
  const { user } = useAuth()
  const isFounder = user?.role === 'Founder'
  const [tab, setTab] = useState('directory')
  const [rows, setRows] = useState([])
  const [pending, setPending] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [saving, setSaving] = useState({})
  const [flash, setFlash] = useState({ text: '', type: 'success' })
  const [confirmTerminate, setConfirmTerminate] = useState(null)

  const showFlash = (text, type = 'success') => {
    setFlash({ text, type })
    setTimeout(() => setFlash({ text: '', type: 'success' }), 4000)
  }

  const load = () => api.get('/employees').then(r => setRows(r.data)).catch(() => {})
  const loadPending = () => api.get('/auth/pending').then(r => setPending(r.data)).catch(() => {})
  const loadAllUsers = () =>
    api.get('/employees').then(r => setAllUsers(r.data.filter(u => u.status === 'active'))).catch(() => {})

  useEffect(() => {
    load()
    if (isFounder) { loadPending(); loadAllUsers() }
  }, [isFounder])

  const changeRole = async (id, role) => {
    setSaving(s => ({ ...s, ['role_' + id]: true }))
    try {
      await api.patch(`/employees/${id}/role`, { role })
      showFlash('Role updated successfully.')
      load()
    } catch (e) {
      showFlash(e.response?.data?.message || 'Failed to update role', 'error')
    } finally {
      setSaving(s => ({ ...s, ['role_' + id]: false }))
    }
  }

  const changeManager = async (id, reports_to) => {
    setSaving(s => ({ ...s, ['mgr_' + id]: true }))
    try {
      await api.patch(`/employees/${id}/manager`, { reports_to: reports_to || null })
      showFlash('Reporting manager updated.')
      load()
      loadAllUsers()
    } catch (e) {
      showFlash(e.response?.data?.message || 'Failed to update manager', 'error')
    } finally {
      setSaving(s => ({ ...s, ['mgr_' + id]: false }))
    }
  }

  const terminate = async (emp) => {
    setSaving(s => ({ ...s, ['term_' + emp.id]: true }))
    setConfirmTerminate(null)
    try {
      await api.delete(`/employees/${emp.id}`)
      showFlash(`${emp.name} has been terminated.`)
      load()
      loadAllUsers()
    } catch (e) {
      showFlash(e.response?.data?.message || 'Failed to terminate', 'error')
    } finally {
      setSaving(s => ({ ...s, ['term_' + emp.id]: false }))
    }
  }

  const handlePendingAction = async (id, approve) => {
    setSaving(s => ({ ...s, ['pend_' + id]: true }))
    try {
      await api.post(`/auth/approve/${id}`, { approve })
      showFlash(approve ? 'Account activated. User can now log in.' : 'Registration rejected.')
      loadPending()
      load()
    } catch (e) {
      showFlash(e.response?.data?.message || 'Action failed', 'error')
    } finally {
      setSaving(s => ({ ...s, ['pend_' + id]: false }))
    }
  }

  const active = rows.filter(r => r.status === 'active')
  const terminated = rows.filter(r => r.status === 'terminated')

  return (
    <Layout>
      <div className="space-y-4">

        {flash.text && (
          <div className={`text-sm px-4 py-3 rounded-lg font-medium ${flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {flash.text}
          </div>
        )}

        {isFounder && (
          <div className="flex border-b border-gray-200">
            <TabBtn active={tab === 'directory'} onClick={() => setTab('directory')}>
              <Users size={15} />
              Employee Directory
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">{active.length}</span>
            </TabBtn>
            <TabBtn active={tab === 'pending'} onClick={() => { setTab('pending'); loadPending() }}>
              <Clock3 size={15} />
              Pending Approvals
              {pending.length > 0 && <span className="ml-1.5 badge badge-yellow">{pending.length}</span>}
            </TabBtn>
          </div>
        )}

        {tab === 'directory' && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Employee Directory</div>
                {isFounder && (
                  <div className="text-xs text-gray-400 mt-0.5">Manage roles, reporting managers and employment status</div>
                )}
              </div>
              {terminated.length > 0 && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{terminated.length} terminated</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="table-th">Name</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Reports To</th>
                    <th className="table-th">Department</th>
                    <th className="table-th">Status</th>
                    {isFounder && <th className="table-th text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(x => {
                    const isMe = x.email === user.email
                    const isTerminated = x.status === 'terminated'
                    return (
                      <tr key={x.id} className={`table-row ${isTerminated ? 'opacity-50' : ''}`}>
                        <td className="table-td">
                          <div className="font-medium text-gray-800">{x.name}</div>
                          {isTerminated && (
                            <div className="text-[10px] text-red-500 font-semibold uppercase tracking-wide mt-0.5">Terminated</div>
                          )}
                        </td>

                        <td className="table-td">
                          {isFounder && !isMe && !isTerminated ? (
                            <div className="relative inline-block">
                              <select
                                className="appearance-none border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white pr-6 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                                value={x.role}
                                disabled={saving['role_' + x.id]}
                                onChange={e => changeRole(x.id, e.target.value)}
                              >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                          ) : (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor[x.role] || ''}`}>{x.role}</span>
                          )}
                        </td>

                        <td className="table-td text-gray-500 text-xs">{x.email}</td>

                        <td className="table-td">
                          {isFounder && !isMe && !isTerminated ? (
                            <div className="relative inline-block">
                              <select
                                className="appearance-none border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white pr-6 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer max-w-[160px]"
                                value={x.reports_to || ''}
                                disabled={saving['mgr_' + x.id]}
                                onChange={e => changeManager(x.id, e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">— None —</option>
                                {allUsers.filter(u => u.id !== x.id).map(u => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-gray-600">{x.manager_name || '—'}</span>
                          )}
                        </td>

                        <td className="table-td text-gray-500">{x.department || '—'}</td>

                        <td className="table-td">
                          <span className={`badge ${isTerminated ? 'badge-red' : 'badge-green'}`}>
                            {isTerminated ? 'Terminated' : 'Active'}
                          </span>
                        </td>

                        {isFounder && (
                          <td className="table-td text-right">
                            {!isMe && !isTerminated && (
                              <button
                                onClick={() => setConfirmTerminate(x)}
                                disabled={saving['term_' + x.id]}
                                className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                              >
                                <UserMinus size={13} />
                                Terminate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={isFounder ? 7 : 6} className="table-td text-center text-gray-400 py-8">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'pending' && isFounder && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-800">Pending Registration Requests</div>
              <div className="text-xs text-gray-400 mt-0.5">
                These users have registered but cannot log in until you approve their account.
              </div>
            </div>

            {pending.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <UserCheck size={32} className="text-gray-200 mx-auto mb-3" />
                <div className="text-sm text-gray-400">No pending registrations at this time.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="table-th">Name</th>
                      <th className="table-th">Email</th>
                      <th className="table-th">Reporting To</th>
                      <th className="table-th">Applied On</th>
                      <th className="table-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(p => (
                      <tr key={p.id} className="table-row">
                        <td className="table-td font-medium text-gray-800">{p.name}</td>
                        <td className="table-td text-gray-500 text-xs">{p.email}</td>
                        <td className="table-td text-gray-500">{p.manager_name || '—'}</td>
                        <td className="table-td text-gray-400 text-xs">
                          {new Date(p.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handlePendingAction(p.id, true)}
                              disabled={saving['pend_' + p.id]}
                              className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium transition-colors"
                            >
                              <UserCheck size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handlePendingAction(p.id, false)}
                              disabled={saving['pend_' + p.id]}
                              className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium transition-colors"
                            >
                              <UserX size={13} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmTerminate && (
        <ConfirmModal
          name={confirmTerminate.name}
          onConfirm={() => terminate(confirmTerminate)}
          onCancel={() => setConfirmTerminate(null)}
        />
      )}
    </Layout>
  )
}

function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">Terminate Employee</div>
            <div className="text-xs text-gray-400">This action cannot be undone</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          Are you sure you want to terminate{' '}
          <span className="font-semibold text-gray-800">{name}</span>?
          Their account will be deactivated and they will no longer be able to log in.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, Terminate
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-brand text-brand bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
