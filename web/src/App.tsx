import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppNotices } from './components/AppNotices'
import { CallOverlay } from './components/CallOverlay'
import { Spinner } from './components/Spinner'
import { AppShell } from './layouts/AppShell'
import { AuthLayout } from './layouts/AuthLayout'
import { RequireAuth, RequireGuest } from './routes/guards'
import { Blocked } from './pages/Blocked'
import { Onboarding } from './pages/Onboarding'
import { Splash } from './pages/Splash'
import { Forgot } from './pages/auth/Forgot'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Reset } from './pages/auth/Reset'
import { RoleSelect } from './pages/auth/RoleSelect'
import { Verify } from './pages/auth/Verify'
import { ChatsList } from './pages/app/ChatsList'
import { ConversationChat } from './pages/app/ConversationChat'
import { DriverDashboard } from './pages/app/DriverDashboard'
import { Help } from './pages/app/Help'
import { History } from './pages/app/History'
import { Home } from './pages/app/Home'
import { News } from './pages/app/News'
import { NewsDetail } from './pages/app/NewsDetail'
import { Payments } from './pages/app/Payments'
import { Premium } from './pages/app/Premium'
import { Profile } from './pages/app/Profile'
import { Ratings } from './pages/app/Ratings'
import { Settings } from './pages/app/Settings'
import { useAppStore } from './store/app'

const MapView = lazy(() => import('./pages/app/MapView').then((module) => ({ default: module.MapView })))
const RouteDetail = lazy(() =>
  import('./pages/app/RouteDetail').then((module) => ({ default: module.RouteDetail })),
)
const DriverMap = lazy(() =>
  import('./pages/app/DriverMap').then((module) => ({ default: module.DriverMap })),
)
const DriverRatings = lazy(() =>
  import('./pages/app/DriverRatings').then((module) => ({ default: module.DriverRatings })),
)

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <Spinner size={28} />
    </div>
  )
}

function App() {
  const darkMode = useAppStore((state) => state.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  return (
    <>
    <Suspense fallback={<PageFallback />}>
      <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/blocked" element={<Blocked />} />

      <Route
        path="/auth"
        element={
          <RequireGuest>
            <AuthLayout />
          </RequireGuest>
        }
      >
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="role" element={<RoleSelect />} />
        <Route path="register" element={<Register />} />
        <Route path="verify" element={<Verify />} />
        <Route path="forgot" element={<Forgot />} />
        <Route path="reset" element={<Reset />} />
      </Route>

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="map" element={<MapView />} />
        <Route path="routes/:id" element={<RouteDetail />} />
        <Route path="news" element={<News />} />
        <Route path="news/:id" element={<NewsDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="history" element={<History />} />
        <Route path="payments" element={<Payments />} />
        <Route path="ratings" element={<Ratings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="premium" element={<Premium />} />
        <Route path="chats" element={<ChatsList />} />
        <Route path="chat/:id" element={<ConversationChat />} />
        <Route path="driver" element={<DriverDashboard />} />
        <Route path="driver/map" element={<DriverMap />} />
        <Route path="driver/ratings" element={<DriverRatings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    <AppNotices />
    <CallOverlay />
    </>
  )
}

export default App
