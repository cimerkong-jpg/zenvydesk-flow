import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { DraftsPage } from './pages/DraftsPage'
import { SchedulePage } from './pages/SchedulePage'
import { PostHistoryPage } from './pages/PostHistoryPage'
import { ProductsPage } from './pages/ProductsPage'
import { ContentLibraryPage } from './pages/ContentLibraryPage'
import { AutomationRulesPage } from './pages/AutomationRulesPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="post-history" element={<PostHistoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="content-library" element={<ContentLibraryPage />} />
        <Route path="automation-rules" element={<AutomationRulesPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
