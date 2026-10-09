import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { Toaster } from './components/Toast'
import { onSessionExpired } from './lib/auth'
import { useAuthStore } from './store/auth'
import { DashboardPage } from './pages/Dashboard'
import { DriversPage } from './pages/Drivers'
import { LoginPage } from './pages/Login'
import { NewsPage } from './pages/News'
import { PremiumPage } from './pages/Premium'
import { ReviewsPage } from './pages/Reviews'
import { SettingsPage } from './pages/Settings'
import { UsersPage } from './pages/Users'
import { VehiclesPage } from './pages/Vehicles'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => setExpired(true))
    return () => {
      unsubscribe()
    }
  }, [])

  if (expired || !isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/app', element: <DashboardPage /> },
          { path: '/app/users', element: <UsersPage /> },
          { path: '/app/drivers', element: <DriversPage /> },
          { path: '/app/vehicles', element: <VehiclesPage /> },
          { path: '/app/news', element: <NewsPage /> },
          { path: '/app/reviews', element: <ReviewsPage /> },
          { path: '/app/premium', element: <PremiumPage /> },
          { path: '/app/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
