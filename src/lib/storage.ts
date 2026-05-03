import type { ThemeMode } from './types'

// Theme is the only thing we still persist client-side. All expense /
// member / category data lives in Supabase now and is fetched on login.

const THEME_KEY = 'expense-tracker:theme'
const LEGACY_THEME_KEYS = [
  'expense-tracker:v4:theme',
  'expense-tracker:v3:theme',
]

export function loadTheme(): ThemeMode {
  try {
    const stored =
      localStorage.getItem(THEME_KEY) ??
      LEGACY_THEME_KEYS.map((k) => localStorage.getItem(k)).find(
        (v) => v !== null,
      ) ??
      null
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // ignore — Safari private mode etc.
  }
  // Default to dark on first load. Toggle still flips it.
  return 'dark'
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    // ignore
  }
}

// Palette offered when creating a new category in Settings.
export const CATEGORY_COLORS = [
  '#f97316',
  '#0ea5e9',
  '#ec4899',
  '#8b5cf6',
  '#10b981',
  '#ef4444',
  '#6366f1',
  '#64748b',
  '#facc15',
  '#14b8a6',
] as const
