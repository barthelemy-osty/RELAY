import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { PricingPage } from './pages/PricingPage'
import { useAuthStore } from './store/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { user, privateKey, isLoading } = useAuthStore()
  if (isLoading) return null
  if (user && privateKey) return <Navigate to="/chat" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/chat" replace /> },
  {
    path: '/login',
    element: <RedirectIfAuth><Login /></RedirectIfAuth>,
  },
  {
    path: '/register',
    element: <RedirectIfAuth><Register /></RedirectIfAuth>,
  },
  {
    path: '/chat',
    element: <RequireAuth><Chat /></RequireAuth>,
  },
  {
    path: '/settings',
    element: <RequireAuth><Settings /></RequireAuth>,
  },
  {
    path: '/pricing',
    element: <RequireAuth><PricingPage /></RequireAuth>,
  },
])
