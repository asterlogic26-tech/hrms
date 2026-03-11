import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle2, XCircle, Clock3, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Attendance() {
  const { user } = useAuth()
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])
  const [todayStatus, setTodayStatus] = useState(null)
  const [holidays, setHolidays] = useState([])

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/attendance/my-attendance')
      setHistory(data)
      const today = new Date().toISOString().slice(0, 10)
      const todayRecord = data.find(d => d.date === today)
      if (todayRecord) {
        if (todayRecord.clock_out) setTodayStatus('clocked_out')
        else if (todayRecord.clock_in) setTodayStatus('clocked_in')
      } else {
        setTodayStatus(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ data: attendanceData }, { data: holidayData }] = await Promise.all([
          api.get('/attendance/my-attendance'),
          api.get('/holidays'),
        ])
        if (cancelled) return
        setHistory(attendanceData)
        setHolidays(holidayData)
        const today = new Date().toISOString().slice(0, 10)
        const todayRecord = attendanceData.find((d) => d.date === today)
        if (todayRecord) {
          if (todayRecord.clock_out) setTodayStatus('clocked_out')
          else if (todayRecord.clock_in) setTodayStatus('clocked_in')
        } else {
          setTodayStatus(null)
        }
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const clockIn = async () => {
    try {
      await api.post('/attendance/clockin')
      setMsg('Clocked in successfully')
      fetchHistory()
    } catch (e) {
      setMsg(e.response?.data?.error || e.response?.data?.message || 'Error')
    }
  }

  const clockOut = async () => {
    try {
      await api.post('/attendance/clockout')
      setMsg('Clocked out successfully')
      fetchHistory()
    } catch (e) {
      setMsg(e.response?.data?.error || e.response?.data?.message || 'Error')
    }
  }

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  const getWorkHours = (record) => {
    if (!record || !record.clock_out) return '-'
    const diff = (new Date(record.clock_out) - new Date(record.clock_in)) / 3600000
    return diff.toFixed(1) + 'h'
  }

  const canApprove = ['Manager', 'Team Lead', 'Founder'].includes(user?.role)
  const isFounder = user?.role === 'Founder'

  return (
    <Layout>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* Clock In / Out — hidden for Founder */}
        {!isFounder && (
          <div className="card p-5">
            <div className="font-semibold text-gray-800 mb-4">Today's Action</div>
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={clockIn}
                disabled={todayStatus === 'clocked_in' || todayStatus === 'clocked_out'}
                className={`px-6 py-2.5 rounded-lg text-white font-medium transition shadow-sm ${
                  todayStatus ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Clock In
              </button>
              <button
                onClick={clockOut}
                disabled={todayStatus !== 'clocked_in'}
                className={`px-6 py-2.5 rounded-lg text-white font-medium transition shadow-sm ${
                  todayStatus !== 'clocked_in' ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                Clock Out
              </button>
              {msg && (
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                  {msg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Calendar + Holidays */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="font-semibold text-gray-800">Attendance Calendar</div>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2 font-medium text-gray-400 text-xs uppercase tracking-wider">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {blanks.map(b => <div key={`b${b}`} className="h-20 bg-gray-50/50 rounded-lg" />)}
              {days.map(d => {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const record = history.find(h => h.date === dateStr)
                const holiday = holidays.find(h => h.date === dateStr)
                const isToday = d === now.getDate()
                return (
                  <div key={d} className={`h-20 border rounded-lg p-1.5 flex flex-col justify-between transition-colors ${
                    isToday ? 'ring-2 ring-brand ring-offset-1' : ''
                  } ${
                    record ? 'bg-blue-50/80 border-blue-100' : holiday ? 'bg-red-50/80 border-red-100' : 'bg-white border-gray-100'
                  }`}>
                    <span className={`text-xs font-semibold ${isToday ? 'text-brand' : 'text-gray-600'}`}>{d}</span>
                    {holiday && !record && (
                      <div className="text-[10px] text-red-600 font-medium text-center break-words leading-tight">{holiday.name}</div>
                    )}
                    {record && (
                      <div className="text-[10px] space-y-0.5">
                        <div className="flex justify-between text-green-700">
                          <span>In</span>
                          <span>{new Date(record.clock_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})}</span>
                        </div>
                        {record.clock_out && (
                          <div className="flex justify-between text-red-600">
                            <span>Out</span>
                            <span>{new Date(record.clock_out).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})}</span>
                          </div>
                        )}
                        {record.clock_out && (
                          <div className="font-bold text-gray-700 text-right border-t border-blue-200 pt-0.5">
                            {getWorkHours(record)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-5 h-fit">
            <div className="font-semibold text-gray-800 mb-4">Upcoming Holidays</div>
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {holidays.length === 0 && <div className="text-sm text-gray-400">No holidays found.</div>}
              {holidays.filter(h => h.date >= new Date().toISOString().slice(0,10)).map(h => (
                <div key={h.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0">
                  <div className="bg-red-50 text-red-500 font-bold rounded-lg px-2 py-1 text-xs text-center min-w-[44px] shrink-0">
                    <div className="text-base leading-tight">{new Date(h.date).getDate()}</div>
                    <div className="uppercase text-[10px]">{new Date(h.date).toLocaleString('default',{month:'short'})}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                    <div className="text-xs text-gray-400">{new Date(h.date).toLocaleString('default',{weekday:'long'})}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regularization section */}
        <RegularizationSection canApprove={canApprove} />

        {/* Founder: Historical attendance viewer */}
        {isFounder && <FounderAttendanceViewer />}

      </div>
    </Layout>
  )
}

// ── Founder: full historical attendance viewer ─────────────────────────────────

function FounderAttendanceViewer() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (date) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/attendance/all?date=${date}`)
      setRows(data.rows || [])
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedDate) }, [selectedDate])

  const shiftDay = (delta) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    const next = d.toISOString().slice(0, 10)
    if (next <= today) setSelectedDate(next)
  }

  const fmtTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : '–'

  const calcHours = (r) => {
    if (!r.clock_in || !r.clock_out) return null
    return ((new Date(r.clock_out) - new Date(r.clock_in)) / 3600000).toFixed(1)
  }

  const isToday = selectedDate === today

  // Summary counts
  const present   = rows.filter(r => r.clock_in && r.clock_out).length
  const working   = rows.filter(r => r.clock_in && !r.clock_out).length
  const absent    = rows.filter(r => !r.clock_in).length
  const underHrs  = rows.filter(r => {
    const h = calcHours(r)
    return h !== null && parseFloat(h) < 4
  }).length

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="font-semibold text-gray-800">
          Attendance Overview
          {isToday && <span className="ml-2 text-xs text-brand bg-blue-50 px-2 py-0.5 rounded-full font-medium">Today</span>}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            max={today}
            value={selectedDate}
            onChange={e => e.target.value && e.target.value <= today && setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
          />
          <button
            onClick={() => shiftDay(1)}
            disabled={isToday}
            className={`p-1.5 rounded-lg transition ${isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-200 text-gray-500'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {!loading && rows.length > 0 && (
        <div className="flex gap-3 flex-wrap px-5 pt-4">
          <Chip label="Present" value={present}    color="text-green-700 bg-green-50" />
          <Chip label="Working" value={working}    color="text-blue-700 bg-blue-50" />
          <Chip label="Absent"  value={absent}     color="text-red-600 bg-red-50" />
          <Chip label="< 4 hrs" value={underHrs}   color="text-orange-600 bg-orange-50" />
          <Chip label="Total"   value={rows.length} color="text-gray-700 bg-gray-100" />
        </div>
      )}

      <div className="p-5">
        {loading && (
          <div className="text-center text-gray-400 py-8">Loading…</div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg mb-3">{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">
            No attendance records for {selectedDate}.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Employee</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Clock In</th>
                  <th className="table-th">Clock Out</th>
                  <th className="table-th">Hours</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const hrs = calcHours(r)
                  const underHours = hrs !== null && parseFloat(hrs) < 4
                  let statusLabel = 'Absent'
                  let badgeCls    = 'badge-red'
                  if (r.clock_in && r.clock_out) { statusLabel = 'Present'; badgeCls = 'badge-green' }
                  else if (r.clock_in)            { statusLabel = 'Working'; badgeCls = 'badge-blue' }
                  return (
                    <tr key={r.user_id} className="table-row">
                      <td className="table-td font-medium text-gray-800">{r.name}</td>
                      <td className="table-td text-gray-400 text-xs">{r.role}</td>
                      <td className="table-td">{fmtTime(r.clock_in)}</td>
                      <td className="table-td">{fmtTime(r.clock_out)}</td>
                      <td className="table-td">
                        {hrs !== null ? (
                          <span className={`font-medium ${underHours ? 'text-orange-500' : 'text-green-700'}`}>
                            {hrs}h{underHours ? ' ⚠' : ''}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="table-td">
                        <span className={`badge ${badgeCls}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value, color }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
      <span>{value}</span>
      <span className="font-normal opacity-70">{label}</span>
    </div>
  )
}

// ── Regularization section ─────────────────────────────────────────────────────

function RegularizationSection({ canApprove }) {
  const [tab, setTab] = useState('apply') // 'apply' | 'history' | 'approvals'
  const [form, setForm] = useState({ date: '', clock_in: '', clock_out: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [myList, setMyList] = useState([])
  const [pending, setPending] = useState([])

  const loadMy = () => api.get('/attendance/regularize/my').then(r => setMyList(r.data)).catch(() => {})
  const loadPending = () => api.get('/attendance/regularize/pending').then(r => setPending(r.data)).catch(() => {})

  useEffect(() => {
    loadMy()
    if (canApprove) loadPending()
  }, [canApprove])

  const submit = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    setSubmitting(true)
    try {
      await api.post('/attendance/regularize', form)
      setForm({ date: '', clock_in: '', clock_out: '', reason: '' })
      setMsg('Regularization request submitted successfully.')
      loadMy()
      setTab('history')
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id, approve) => {
    try {
      await api.put(`/attendance/regularize/${id}/approve`, { approve })
      loadPending()
      loadMy()
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to process request')
    }
  }

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() - 1)
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  const STATUS_ICON = {
    Pending:  <Clock3 size={14} className="text-yellow-500" />,
    Approved: <CheckCircle2 size={14} className="text-green-500" />,
    Rejected: <XCircle size={14} className="text-red-500" />,
  }

  return (
    <div className="card overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <TabBtn active={tab === 'apply'} onClick={() => setTab('apply')}>Regularize Attendance</TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => { setTab('history'); loadMy() }}>
          My Requests {myList.filter(r => r.status === 'Pending').length > 0 && (
            <span className="ml-1.5 badge badge-yellow">{myList.filter(r => r.status === 'Pending').length}</span>
          )}
        </TabBtn>
        {canApprove && (
          <TabBtn active={tab === 'approvals'} onClick={() => { setTab('approvals'); loadPending() }}>
            Pending Approvals {pending.length > 0 && (
              <span className="ml-1.5 badge badge-red">{pending.length}</span>
            )}
          </TabBtn>
        )}
      </div>

      <div className="p-5">

        {/* Apply tab */}
        {tab === 'apply' && (
          <div className="max-w-2xl">
            <p className="text-sm text-gray-500 mb-4">
              Missed clocking in/out on a past date? Submit a regularization request — your manager will review and approve it.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    max={maxDateStr}
                    className="input-field"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                  />
                  <div className="text-[11px] text-gray-400 mt-1">Select any past date to regularize</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason <span className="text-red-400">*</span></label>
                  <input
                    className="input-field"
                    placeholder="e.g. Forgot to punch in from WFH"
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">In Time <span className="text-red-400">*</span></label>
                  <input
                    type="time"
                    className="input-field"
                    value={form.clock_in}
                    onChange={e => setForm({ ...form, clock_in: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Out Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={form.clock_out}
                    onChange={e => setForm({ ...form, clock_out: e.target.value })}
                  />
                  <div className="text-[11px] text-gray-400 mt-1">Leave blank if you only need in-time</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
                {msg && <span className="text-sm text-green-600">{msg}</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div>
            {myList.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No regularization requests yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Date</th>
                      <th className="table-th">In Time</th>
                      <th className="table-th">Out Time</th>
                      <th className="table-th">Reason</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Actioned By</th>
                      <th className="table-th">Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myList.map(r => (
                      <tr key={r.id} className="table-row">
                        <td className="table-td font-medium">{r.date}</td>
                        <td className="table-td">{r.clock_in}</td>
                        <td className="table-td">{r.clock_out || '–'}</td>
                        <td className="table-td text-gray-500 max-w-[180px] truncate">{r.reason || '–'}</td>
                        <td className="table-td">
                          <span className={`badge ${r.status === 'Approved' ? 'badge-green' : r.status === 'Rejected' ? 'badge-red' : 'badge-yellow'} flex items-center gap-1 w-fit`}>
                            {STATUS_ICON[r.status]} {r.status}
                          </span>
                        </td>
                        <td className="table-td text-gray-500">{r.approved_by_name || '–'}</td>
                        <td className="table-td text-gray-400 text-xs">{r.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Approvals tab */}
        {tab === 'approvals' && canApprove && (
          <div>
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            {pending.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No pending regularization requests.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th">Employee</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">In Time</th>
                      <th className="table-th">Out Time</th>
                      <th className="table-th">Reason</th>
                      <th className="table-th">Applied On</th>
                      <th className="table-th">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(r => (
                      <tr key={r.id} className="table-row">
                        <td className="table-td">
                          <div className="font-medium text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-400">{r.role}</div>
                        </td>
                        <td className="table-td font-medium">{r.date}</td>
                        <td className="table-td">{r.clock_in}</td>
                        <td className="table-td">{r.clock_out || '–'}</td>
                        <td className="table-td text-gray-500 max-w-[180px] truncate">{r.reason || '–'}</td>
                        <td className="table-td text-gray-400 text-xs">{r.created_at?.slice(0, 10)}</td>
                        <td className="table-td">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(r.id, true)}
                              className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprove(r.id, false)}
                              className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium transition-colors"
                            >
                              Reject
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
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-brand text-brand bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
      }`}
    >
      {children}
    </button>
  )
}
