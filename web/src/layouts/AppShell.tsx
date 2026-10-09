import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

export function AppShell() {
  return (
    <div className="shell">
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
