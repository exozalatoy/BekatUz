import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { RealtimeSocket } from '../components/RealtimeSocket'

export function AppShell() {
  return (
    <div className="shell">
      <RealtimeSocket />
      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
