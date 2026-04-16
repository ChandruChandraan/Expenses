import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="relative inline-flex h-7 w-12 items-center rounded-full bg-neutral-200 p-0.5 transition-colors dark:bg-neutral-700"
    >
      <span
        className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:bg-neutral-900 ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-indigo-400" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
      </span>
    </button>
  )
}
