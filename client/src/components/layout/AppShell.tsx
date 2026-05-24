import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import GlobalNotifications from './GlobalNotifications'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <Navbar />
      <main className="pt-20 pb-20 md:pb-0 mx-auto max-w-7xl px-4 md:px-8">
        <Outlet />
      </main>
      <GlobalNotifications />
    </div>
  )
}
