import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ children }) {
  const { user } = useAuth()
  return (
    <div className="h-full flex">
      <Sidebar role={user?.role} user={user} />
      <div className="flex-1 flex flex-col bg-gray-50">
        <Topbar />
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
