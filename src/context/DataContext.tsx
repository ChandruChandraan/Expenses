import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category, Expense, Member } from '../lib/types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

type DataContextValue = {
  loading: boolean
  members: Member[]
  categories: Category[]
  expenses: Expense[]
  addMember: (name: string) => Promise<Member | null>
  renameMember: (id: string, name: string) => Promise<void>
  removeMember: (id: string) => Promise<void>
  addCategory: (name: string, color: string) => Promise<Category | null>
  renameCategory: (id: string, name: string, color: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, patch: Omit<Expense, 'id'>) => Promise<void>
  removeExpense: (id: string) => Promise<void>
  togglePaid: (id: string, memberId: string) => Promise<void>
  markAllPaid: (id: string) => Promise<void>
  markAllPending: (id: string) => Promise<void>
  clearAllExpenses: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

type ExpenseRow = {
  id: string
  amount: number | string
  description: string | null
  category_id: string
  date: string
  paid_by: string
  split_among: string[] | null
  settled_by: string[] | null
  shares: Record<string, number> | null
}

function rowToExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    amount: typeof r.amount === 'string' ? Number(r.amount) : r.amount,
    description: r.description ?? '',
    categoryId: r.category_id,
    date: r.date,
    paidBy: r.paid_by,
    splitAmong: r.split_among ?? [],
    settledBy: r.settled_by ?? [],
    shares: r.shares ?? undefined,
  }
}

function expenseToRow(e: Omit<Expense, 'id'>, userId: string) {
  return {
    user_id: userId,
    amount: e.amount,
    description: e.description ?? '',
    category_id: e.categoryId,
    date: e.date,
    paid_by: e.paidBy,
    split_among: e.splitAmong,
    settled_by: e.settledBy,
    shares: e.shares ?? null,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const userId = state.status === 'signed-in' ? state.user.id : null

  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  // Snapshot ref so single-row helpers don't re-bind every render.
  const expensesRef = useRef(expenses)
  useEffect(() => {
    expensesRef.current = expenses
  }, [expenses])

  // Initial load (and re-load on user change).
  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setMembers([])
      setCategories([])
      setExpenses([])
      setLoading(false)
      return
    }
    setLoading(true)
    void (async () => {
      const [mRes, cRes, eRes] = await Promise.all([
        supabase.from('members').select('id, name').order('created_at'),
        supabase
          .from('categories')
          .select('id, name, color')
          .order('created_at'),
        supabase
          .from('expenses')
          .select(
            'id, amount, description, category_id, date, paid_by, split_among, settled_by, shares',
          )
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (mRes.data) setMembers(mRes.data as Member[])
      if (cRes.data) setCategories(cRes.data as Category[])
      if (eRes.data)
        setExpenses((eRes.data as ExpenseRow[]).map(rowToExpense))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  // ---------- members ----------
  const addMember = useCallback(
    async (name: string): Promise<Member | null> => {
      if (!userId) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
        return null
      }
      const { data, error } = await supabase
        .from('members')
        .insert({ user_id: userId, name: trimmed })
        .select('id, name')
        .single()
      if (error || !data) return null
      const m = data as Member
      setMembers((prev) => [...prev, m])
      return m
    },
    [members, userId],
  )

  const renameMember = useCallback(
    async (id: string, name: string) => {
      if (!userId) return
      const trimmed = name.trim()
      if (!trimmed) return
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
      )
      await supabase.from('members').update({ name: trimmed }).eq('id', id)
    },
    [userId],
  )

  const removeMember = useCallback(
    async (id: string) => {
      if (!userId) return
      // Cascade: delete expenses that touch this member, then the member.
      const touchingIds = expensesRef.current
        .filter((e) => e.paidBy === id || e.splitAmong.includes(id))
        .map((e) => e.id)
      setExpenses((prev) => prev.filter((e) => !touchingIds.includes(e.id)))
      setMembers((prev) => prev.filter((m) => m.id !== id))
      if (touchingIds.length > 0) {
        await supabase.from('expenses').delete().in('id', touchingIds)
      }
      await supabase.from('members').delete().eq('id', id)
    },
    [userId],
  )

  // ---------- categories ----------
  const addCategory = useCallback(
    async (name: string, color: string): Promise<Category | null> => {
      if (!userId) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      if (
        categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
      ) {
        return null
      }
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name: trimmed, color })
        .select('id, name, color')
        .single()
      if (error || !data) return null
      const c = data as Category
      setCategories((prev) => [...prev, c])
      return c
    },
    [categories, userId],
  )

  const renameCategory = useCallback(
    async (id: string, name: string, color: string) => {
      if (!userId) return
      const trimmed = name.trim()
      if (!trimmed) return
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmed, color } : c)),
      )
      await supabase
        .from('categories')
        .update({ name: trimmed, color })
        .eq('id', id)
    },
    [userId],
  )

  const removeCategory = useCallback(
    async (id: string) => {
      if (!userId) return
      if (categories.length <= 1) return
      const fallback = categories.find((c) => c.id !== id)
      if (!fallback) return
      // Re-point any expenses on this category to the fallback first so the
      // FK delete doesn't blow up.
      const movingIds = expensesRef.current
        .filter((e) => e.categoryId === id)
        .map((e) => e.id)
      setExpenses((prev) =>
        prev.map((e) =>
          e.categoryId === id ? { ...e, categoryId: fallback.id } : e,
        ),
      )
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (movingIds.length > 0) {
        await supabase
          .from('expenses')
          .update({ category_id: fallback.id })
          .in('id', movingIds)
      }
      await supabase.from('categories').delete().eq('id', id)
    },
    [categories, userId],
  )

  // ---------- expenses ----------
  const addExpense = useCallback(
    async (e: Omit<Expense, 'id'>) => {
      if (!userId) return
      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseToRow(e, userId))
        .select(
          'id, amount, description, category_id, date, paid_by, split_among, settled_by, shares',
        )
        .single()
      if (error || !data) return
      setExpenses((prev) => [rowToExpense(data as ExpenseRow), ...prev])
    },
    [userId],
  )

  const updateExpense = useCallback(
    async (id: string, patch: Omit<Expense, 'id'>) => {
      if (!userId) return
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...patch, id } : e)),
      )
      await supabase
        .from('expenses')
        .update(expenseToRow(patch, userId))
        .eq('id', id)
    },
    [userId],
  )

  const removeExpense = useCallback(
    async (id: string) => {
      if (!userId) return
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      await supabase.from('expenses').delete().eq('id', id)
    },
    [userId],
  )

  const togglePaid = useCallback(
    async (id: string, memberId: string) => {
      if (!userId) return
      const target = expensesRef.current.find((e) => e.id === id)
      if (!target) return
      if (!target.splitAmong.includes(memberId)) return
      const alreadyPaid = target.settledBy.includes(memberId)
      const nextSettled = alreadyPaid
        ? target.settledBy.filter((x) => x !== memberId)
        : [...target.settledBy, memberId]
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, settledBy: nextSettled } : e)),
      )
      await supabase
        .from('expenses')
        .update({ settled_by: nextSettled })
        .eq('id', id)
    },
    [userId],
  )

  const markAllPaid = useCallback(
    async (id: string) => {
      if (!userId) return
      const target = expensesRef.current.find((e) => e.id === id)
      if (!target) return
      const nextSettled = [...target.splitAmong]
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, settledBy: nextSettled } : e)),
      )
      await supabase
        .from('expenses')
        .update({ settled_by: nextSettled })
        .eq('id', id)
    },
    [userId],
  )

  const markAllPending = useCallback(
    async (id: string) => {
      if (!userId) return
      const target = expensesRef.current.find((e) => e.id === id)
      if (!target) return
      const nextSettled = [target.paidBy]
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, settledBy: nextSettled } : e)),
      )
      await supabase
        .from('expenses')
        .update({ settled_by: nextSettled })
        .eq('id', id)
    },
    [userId],
  )

  const clearAllExpenses = useCallback(async () => {
    if (!userId) return
    setExpenses([])
    await supabase.from('expenses').delete().eq('user_id', userId)
  }, [userId])

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
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
      loading,
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
