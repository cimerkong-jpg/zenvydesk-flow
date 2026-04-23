import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingState } from './components/LoadingState'
import { useAuth } from './context/AuthContext'
import { AutomationRulesPage } from './pages/AutomationRulesPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { ContentLibraryPage } from './pages/ContentLibraryPage'
import { CreativeWithAIPage } from './pages/CreativeWithAIPage'
import { DashboardPage } from './pages/DashboardPage'
import { DraftsPage } from './pages/DraftsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { PostHistoryPage } from './pages/PostHistoryPage'
import { ProductsPage } from './pages/ProductsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'


function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element
  roles?: Array<'super_admin' | 'admin' | 'member'>
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}


function ProtectedApp() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="post-history" element={<PostHistoryPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="content-library" element={<ContentLibraryPage />} />
          <Route path="creative-ai" element={<CreativeWithAIPage />} />
          <Route path="automation-rules" element={<AutomationRulesPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={<SettingsPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  )
}


function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}


export default App
