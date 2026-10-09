import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="shell">
      <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col px-6 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
