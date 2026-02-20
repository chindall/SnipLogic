import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ImportPage from './pages/ImportPage'
import SettingsPage from './pages/SettingsPage'
import SetupPage from './pages/SetupPage'
import { useAuthStore } from './store/authStore'
import { setupApi } from './api/setup'

const queryClient = new QueryClient()

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    setupApi.status()
      .then((data) => setConfigured(data.configured))
      .catch(() => setConfigured(true)) // if the check fails, assume configured and let login handle it
  }, [])

  // Show nothing while we check — avoids any flash of wrong page
  if (configured === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="3"  y="3"  width="7" height="7" rx="1.5" fill="#3b82f6"/>
          <rect x="14" y="3"  width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
          <rect x="3"  y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.3"/>
        </svg>
      </div>
    )
  }

  // Fresh install — only show the setup wizard, block everything else
  if (!configured) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  // Configured — normal app routing
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/import" element={<PrivateRoute><ImportPage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/users" element={<Navigate to="/settings" replace />} />
      <Route path="/setup" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
