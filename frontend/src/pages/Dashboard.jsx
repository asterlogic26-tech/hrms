import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import api from '../services/api'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState({ totalEmployees: 0, presentToday: 0 })

  useEffect(() => {
    api.get('/attendance/summary').then(r => setSummary(r.data)).catch(()=>{})
  }, [])

  const chartData = {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      {
        label: 'Attendance',
        data: [3,5,7,6,8,4,5],
        borderColor: '#0A3D62',
        tension: .3
      }
    ]
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-gray-500 text-sm">Total Employees</div>
          <div className="text-3xl font-semibold">{summary.totalEmployees}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-500 text-sm">Present Today</div>
          <div className="text-3xl font-semibold">{summary.presentToday}</div>
        </div>
        <div className="card p-4">
          <div className="text-gray-500 text-sm">Pending Leaves</div>
          <PendingLeaves />
        </div>
      </div>
      <div className="card p-4 mt-6">
        <div className="font-semibold mb-2">Attendance Analytics</div>
        <Line data={chartData} />
      </div>
    </Layout>
  )
}

function PendingLeaves() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!user) return
    api.get('/leaves').then(r => {
      const c = r.data.filter(x => x.status === 'Pending').length
      setCount(c)
    }).catch(()=>{})
  }, [user])
  return <div className="text-3xl font-semibold">{count}</div>
}
