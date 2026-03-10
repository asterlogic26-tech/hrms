import Layout from '../components/Layout'
import api from '../services/api'
import { useEffect, useState } from 'react'

export default function Employees() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    api.get('/employees').then(r=>setRows(r.data)).catch(()=>{})
  }, [])
  return (
    <Layout>
      <div className="card p-4">
        <div className="font-semibold mb-2">Employee Directory</div>
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
            {rows.map(x=>(
              <tr key={x.id} className="border-t">
                <td className="py-2">{x.name}</td>
                <td>{x.role}</td>
                <td>{x.email}</td>
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
