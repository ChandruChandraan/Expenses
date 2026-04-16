import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Category, Expense, Member } from '../lib/types'
import {
  KEYS,
  loadInitialCategories,
  loadInitialExpenses,
  loadInitialMembers,
  saveJSON,
  uid,
} from '../lib/storage'

type DataContextValue = {
  members: Member[]
  categories: Category[]
  expenses: Expense[]
  addMember: (name: string) => Member | null
  renameMember: (id: string, name: string) => void
  removeMember: (id: string) => void
  addCategory: (name: string, color: string) => Category | null
  renameCategory: (id: string, name: string, color: string) => void
  removeCategory: (id: string) => void
  addExpense: (e: Omit<Expense, 'id'>) => void
  updateExpense: (id: string, patch: Omit<Expense, 'id'>) => void
  removeExpense: (id: string) => void
  togglePaid: (id: string, memberId: string) => void
  markAllPaid: (id: string) => void
  markAllPending: (id: string) => void
  clearAllExpenses: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

function initialData() {
  const members = loadInitialMembers()
  const categories = loadInitialCategories()
  const loaded = loadInitialExpenses(members, categories)
  const validIds = new Set(categories.map((c) => c.id))
  const fallbackId =
    categories.find((c) => c.name.toLowerCase() === 'other')?.id ??
    categories[categories.length - 1]?.id ??
    ''
  const expenses = loaded.map((e) =>
    validIds.has(e.categoryId) ? e : { ...e, categoryId: fallbackId },
  )
  return { members, categories, expenses }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const seed = useMemo(() => initialData(), [])
  const [members, setMembers] = useState<Member[]>(seed.members)
  const [categories, setCategories] = useState<Category[]>(seed.categories)
  const [expenses, setExpenses] = useState<Expense[]>(seed.expenses)

  useEffect(() => {
    saveJSON(KEYS.members, members)
  }, [members])
  useEffect(() => {
    saveJSON(KEYS.categories, categories)
  }, [categories])
  useEffect(() => {
    saveJSON(KEYS.expenses, expenses)
  }, [expenses])

  const addMember = useCallback(
    (name: string): Member | null => {
      const trimmed = name.trim()
      if (!trimmed) return null
      if (
        members.some(
          (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        return null
      }
      const m: Member = { id: uid(), name: trimmed }
      setMembers((prev) => [...prev, m])
      return m
    },
    [members],
  )

  const renameMember = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
    )
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setExpenses((prev) =>
      prev.filter((e) => e.paidBy !== id && !e.splitAmong.includes(id)),
    )
  }, [])

  const addCategory = useCallback(
    (name: string, color: string): Category | null => {
      const trimmed = name.trim()
      if (!trimmed) return null
      if (
        categories.some(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        return null
      }
      const c: Category = { id: uid(), name: trimmed, color }
      setCategories((prev) => [...prev, c])
      return c
    },
    [categories],
  )

  const renameCategory = useCallback(
    (id: string, name: string, color: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name: trimmed, color } : c,
        ),
      )
    },
    [],
  )

  const removeCategory = useCallback(
    (id: string) => {
      if (categories.length <= 1) return
      const fallback = categories.find((c) => c.id !== id)
      if (!fallback) return
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setExpenses((prev) =>
        prev.map((e) =>
          e.categoryId === id ? { ...e, categoryId: fallback.id } : e,
        ),
      )
    },
    [categories],
  )

  const addExpense = useCallback((e: Omit<Expense, 'id'>) => {
    const next: Expense = { ...e, id: uid() }
    setExpenses((prev) => [next, ...prev])
  }, [])

  const updateExpense = useCallback(
    (id: string, patch: Omit<Expense, 'id'>) => {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...patch, id } : e)),
      )
    },
    [],
  )

  const removeExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const togglePaid = useCallback((id: string, memberId: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        if (!e.splitAmong.includes(memberId)) return e
        const alreadyPaid = e.settledBy.includes(memberId)
        const nextSettled = alreadyPaid
          ? e.settledBy.filter((x) => x !== memberId)
          : [...e.settledBy, memberId]
        return { ...e, settledBy: nextSettled }
      }),
    )
  }, [])

  const markAllPaid = useCallback((id: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, settledBy: [...e.splitAmong] } : e)),
    )
  }, [])

  const markAllPending = useCallback((id: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, settledBy: [e.paidBy] } : e)),
    )
  }, [])

  const clearAllExpenses = useCallback(() => {
    setExpenses([])
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      members,
      categories,
      expenses,
      addMember,
      renameMember,
      removeMember,
      addCategory,
      renameCategory,
      removeCategory,
      addExpense,
      updateExpense,
      removeExpense,
      togglePaid,
      markAllPaid,
      markAllPending,
      clearAllExpenses,
    }),
    [
      members,
      categories,
      expenses,
      addMember,
      renameMember,
      removeMember,
      addCategory,
      renameCategory,
      removeCategory,
      addExpense,
      updateExpense,
      removeExpense,
      togglePaid,
      markAllPaid,
      markAllPending,
      clearAllExpenses,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
