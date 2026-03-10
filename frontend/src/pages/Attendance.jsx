import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'

export default function Attendance() {
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])
  const [todayStatus, setTodayStatus] = useState(null)

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

  useEffect(() => { fetchHistory() }, [])

  const clockIn = async () => {
    try {
      await api.post('/attendance/clockin')
      setMsg('Clocked in successfully')
      fetchHistory()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    }
  }

  const clockOut = async () => {
    try {
      await api.post('/attendance/clockout')
      setMsg('Clocked out successfully')
      fetchHistory()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
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
    const start = new Date(record.clock_in)
    const end = new Date(record.clock_out)
    const diff = (end - start) / 1000 / 60 / 60
    return diff.toFixed(1) + 'h'
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Actions Card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Today's Action</h2>
          <div className="flex gap-4 items-center flex-wrap">
             <button 
               onClick={clockIn} 
               disabled={todayStatus === 'clocked_in' || todayStatus === 'clocked_out'}
               className={`px-6 py-3 rounded-lg text-white font-medium transition shadow-sm ${todayStatus ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
             >
               Clock In
             </button>
             <button 
               onClick={clockOut} 
               disabled={todayStatus !== 'clocked_in'}
               className={`px-6 py-3 rounded-lg text-white font-medium transition shadow-sm ${todayStatus !== 'clocked_in' ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
             >
               Clock Out
             </button>
             {msg && <span className="text-sm font-medium text-blue-600 animate-pulse bg-blue-50 px-3 py-1 rounded-full">{msg}</span>}
          </div>
        </div>

        {/* Calendar Card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 flex justify-between items-center">
            <span>Attendance Calendar</span>
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          </h2>
          
          <div className="grid grid-cols-7 gap-2 text-center mb-2 font-medium text-gray-400 text-sm uppercase tracking-wider">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {blanks.map(b => <div key={`blank-${b}`} className="h-24 bg-gray-50/50 rounded-lg"></div>)}
            {days.map(d => {
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const record = history.find(h => h.date === dateStr)
              const isToday = d === now.getDate()
              
              return (
                <div key={d} className={`h-24 border rounded-lg p-2 flex flex-col justify-between transition-colors ${
                  isToday ? 'ring-2 ring-brand ring-offset-1' : ''
                } ${
                  record ? 'bg-blue-50/80 border-blue-100' : 'bg-white border-gray-100 hover:border-gray-200'
                }`}>
                  <span className={`text-sm font-semibold ${isToday ? 'text-brand' : 'text-gray-600'}`}>{d}</span>
                  {record && (
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between text-green-700">
                        <span>In</span>
                        <span>{new Date(record.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}</span>
                      </div>
                      {record.clock_out && (
                        <div className="flex justify-between text-red-700">
                          <span>Out</span>
                          <span>{new Date(record.clock_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}</span>
                        </div>
                      )}
                      {record.clock_out && (
                        <div className="font-bold text-gray-700 text-right mt-1 border-t border-blue-200 pt-0.5">
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
      </div>
    </Layout>
  )
}
