import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import AuthPage from './pages/AuthPage'

function AuthGate() {
  const { state } = useAuth()
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 text-sm">
        Loading…
      </div>
    )
  }
  if (state.status === 'signed-out') {
    return <AuthPage />
  }
  return (
    <DataProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </DataProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
