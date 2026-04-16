import type { Category, Expense, Member, ThemeMode } from './types'

export const KEYS = {
  expenses: 'expense-tracker:v4:expenses',
  members: 'expense-tracker:v4:members',
  categories: 'expense-tracker:v4:categories',
  theme: 'expense-tracker:v4:theme',
  legacyV3Expenses: 'expense-tracker:v3:expenses',
  legacyV3Members: 'expense-tracker:v3:members',
  legacyV3Categories: 'expense-tracker:v3:categories',
  legacyV3Theme: 'expense-tracker:v3:theme',
  legacyV2Expenses: 'expense-tracker:v2:expenses',
  legacyV2Members: 'expense-tracker:v2:members',
  legacyV1: 'expense-tracker:v1',
} as const

export const CATEGORY_COLORS = [
  '#6366f1',
  '#f97316',
  '#10b981',
  '#ec4899',
  '#0ea5e9',
  '#eab308',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
  '#f43f5e',
]

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', color: '#f97316' },
  { name: 'Transport', color: '#0ea5e9' },
  { name: 'Shopping', color: '#ec4899' },
  { name: 'Bills', color: '#8b5cf6' },
  { name: 'Entertainment', color: '#10b981' },
  { name: 'Health', color: '#ef4444' },
  { name: 'Travel', color: '#6366f1' },
  { name: 'Other', color: '#64748b' },
]

export function uid(): string {
  return crypto.randomUUID()
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function loadTheme(): ThemeMode {
  const stored =
    localStorage.getItem(KEYS.theme) ?? localStorage.getItem(KEYS.legacyV3Theme)
  if (stored === 'dark' || stored === 'light') return stored
  // Default to dark on first load. Respect `prefers-color-scheme: light`
  // only when the OS explicitly prefers light.
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light'
  }
  return 'dark'
}

export function saveTheme(mode: ThemeMode): void {
  localStorage.setItem(KEYS.theme, mode)
}

export function loadInitialMembers(): Member[] {
  const stored = loadJSON<Member[]>(KEYS.members, [])
  if (stored.length > 0) return stored
  const v3 = loadJSON<Member[]>(KEYS.legacyV3Members, [])
  if (v3.length > 0) return v3
  const v2 = loadJSON<Member[]>(KEYS.legacyV2Members, [])
  if (v2.length > 0) return v2
  return [
    { id: uid(), name: 'Me' },
    { id: uid(), name: 'Friend' },
  ]
}

export function loadInitialCategories(): Category[] {
  const stored = loadJSON<Category[]>(KEYS.categories, [])
  if (stored.length > 0) return stored
  const v3 = loadJSON<Category[]>(KEYS.legacyV3Categories, [])
  if (v3.length > 0) return v3
  return DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() }))
}

type LegacyV1 = {
  id: string
  amount: number
  description: string
  category: string
  date: string
}

type LegacyV2 = LegacyV1 & {
  paidBy: string
  splitAmong: string[]
}

type LegacyV3 = Omit<Expense, 'settledBy'>

export function loadInitialExpenses(
  members: Member[],
  categories: Category[],
): Expense[] {
  const stored = loadJSON<Expense[]>(KEYS.expenses, [])
  if (stored.length > 0) {
    return stored.map((e) => ({
      ...e,
      settledBy: Array.isArray(e.settledBy) ? e.settledBy : [e.paidBy],
    }))
  }

  const byName = new Map<string, string>()
  for (const c of categories) byName.set(c.name.toLowerCase(), c.id)
  const otherId =
    byName.get('other') ?? categories[categories.length - 1]?.id ?? ''

  const resolveCat = (name: string) =>
    byName.get((name ?? '').toLowerCase()) ?? otherId

  const v3 = loadJSON<LegacyV3[]>(KEYS.legacyV3Expenses, [])
  if (v3.length > 0) {
    return v3.map((e) => ({
      ...e,
      settledBy: [e.paidBy],
    }))
  }

  const v2 = loadJSON<LegacyV2[]>(KEYS.legacyV2Expenses, [])
  if (v2.length > 0) {
    return v2.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      categoryId: resolveCat(e.category),
      date: e.date,
      paidBy: e.paidBy,
      splitAmong: e.splitAmong,
      settledBy: [e.paidBy],
    }))
  }

  const v1 = loadJSON<LegacyV1[]>(KEYS.legacyV1, [])
  if (v1.length === 0 || members.length === 0) return []
  const firstMemberId = members[0].id
  return v1.map((e) => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    categoryId: resolveCat(e.category),
    date: e.date,
    paidBy: firstMemberId,
    splitAmong: [firstMemberId],
    settledBy: [firstMemberId],
  }))
}
