import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Leaves from './pages/Leaves'
import Employees from './pages/Employees'
import Settings from './pages/Settings'
import Register from './pages/Register'
import Holidays from './pages/Holidays'

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
      <Route path="/leaves" element={<Protected><Leaves /></Protected>} />
      <Route path="/holidays" element={<Protected><Holidays /></Protected>} />
      <Route path="/employees" element={<Protected><Employees /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
