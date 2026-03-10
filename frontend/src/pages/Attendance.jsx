import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'

export default function Attendance() {
  const [msg, setMsg] = useState('')
  const clockIn = async () => {
    try {
      const r = await api.post('/attendance/clockin')
      setMsg('Clocked in')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    }
  }
  const clockOut = async () => {
    try {
      const r = await api.post('/attendance/clockout')
      setMsg('Clocked out')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    }
  }
  return (
    <Layout>
      <div className="card p-6 space-y-4 max-w-xl">
        <div className="flex gap-2">
          <button onClick={clockIn} className="btn-primary">Clock In</button>
          <button onClick={clockOut} className="px-4 py-2 rounded-md bg-gray-800 text-white">Clock Out</button>
        </div>
        {msg ? <div className="text-sm text-gray-600">{msg}</div> : null}
      </div>
    </Layout>
  )
}
