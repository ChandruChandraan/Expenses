import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { DataProvider } from './context/DataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <DataProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </DataProvider>
    </ThemeProvider>
  </StrictMode>,
)
