import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/Dashboard'
import { ExpensesPage } from './pages/Expenses'
import { MembersPage } from './pages/Members'
import { SettingsPage } from './pages/Settings'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
