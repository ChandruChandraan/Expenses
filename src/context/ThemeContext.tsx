import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadTheme, saveTheme } from '../lib/storage'
import type { ThemeMode } from '../lib/types'

type ThemeContextValue = {
  mode: ThemeMode
  toggle: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => loadTheme())

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    saveTheme(mode)
  }, [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
