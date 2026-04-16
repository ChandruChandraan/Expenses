import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Users,
  UserPlus,
  Pencil,
  X,
  Check,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import './App.css'

type Member = {
  id: string
  name: string
}

type Expense = {
  id: string
  amount: number
  description: string
  category: string
  date: string
  paidBy: string
  splitAmong: string[]
}

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Travel',
  'Other',
] as const

type Category = (typeof CATEGORIES)[number]

const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Shopping: '#ec4899',
  Bills: '#ef4444',
  Entertainment: '#a855f7',
  Health: '#10b981',
  Travel: '#06b6d4',
  Other: '#6b7280',
}

const EXPENSES_KEY = 'expense-tracker:v2:expenses'
const MEMBERS_KEY = 'expense-tracker:v2:members'
const LEGACY_EXPENSES_KEY = 'expense-tracker:v1'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return fallback
  }
}

function loadInitialMembers(): Member[] {
  const stored = loadJSON<Member[]>(MEMBERS_KEY, [])
  if (stored.length > 0) return stored
  return [
    { id: crypto.randomUUID(), name: 'Me' },
    { id: crypto.randomUUID(), name: 'Friend' },
  ]
}

function loadInitialExpenses(members: Member[]): Expense[] {
  const stored = loadJSON<Expense[]>(EXPENSES_KEY, [])
  if (stored.length > 0) return stored
  const legacy = loadJSON<
    Array<{
      id: string
      amount: number
      description: string
      category: string
      date: string
    }>
  >(LEGACY_EXPENSES_KEY, [])
  if (legacy.length === 0 || members.length === 0) return []
  const firstMemberId = members[0].id
  return legacy.map((e) => ({
    ...e,
    paidBy: firstMemberId,
    splitAmong: [firstMemberId],
  }))
}

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay()
  const diff = (day + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - diff)
  return copy
}

function App() {
  const [members, setMembers] = useState<Member[]>(() => loadInitialMembers())
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadInitialExpenses(loadInitialMembers()),
  )

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Food')
  const [date, setDate] = useState<string>(todayISO())
  const [paidBy, setPaidBy] = useState<string>(() => members[0]?.id ?? '')
  const [splitAmong, setSplitAmong] = useState<string[]>(() =>
    members.map((m) => m.id),
  )

  const [filterCategory, setFilterCategory] = useState<'All' | Category>('All')
  const [filterMember, setFilterMember] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [newMemberName, setNewMemberName] = useState('')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingMemberName, setEditingMemberName] = useState('')

  useEffect(() => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members))
  }, [members])

  useEffect(() => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
  }, [expenses])

  // Keep paidBy valid
  useEffect(() => {
    if (members.length === 0) {
      setPaidBy('')
      return
    }
    if (!members.find((m) => m.id === paidBy)) {
      setPaidBy(members[0].id)
    }
  }, [members, paidBy])

  // Keep splitAmong valid
  useEffect(() => {
    setSplitAmong((prev) => prev.filter((id) => members.some((m) => m.id === id)))
  }, [members])

  const memberById = useMemo(() => {
    const map = new Map<string, Member>()
    for (const m of members) map.set(m.id, m)
    return map
  }, [members])

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (members.length === 0) {
      setError('Add at least one member before recording expenses.')
      return
    }
    if (!description.trim()) {
      setError('Please enter a description.')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (!paidBy) {
      setError('Select who paid.')
      return
    }
    if (splitAmong.length === 0) {
      setError('Select at least one member to split with.')
      return
    }
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      category,
      date,
      paidBy,
      splitAmong: [...splitAmong],
    }
    setExpenses((prev) => [newExpense, ...prev])
    setAmount('')
    setDescription('')
    setCategory('Food')
    setDate(todayISO())
    setError(null)
  }

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const handleClearAll = () => {
    if (expenses.length === 0) return
    const ok = window.confirm('Delete all expenses? This cannot be undone.')
    if (ok) setExpenses([])
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newMemberName.trim()
    if (!name) return
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    const newMember: Member = { id: crypto.randomUUID(), name }
    setMembers((prev) => [...prev, newMember])
    setSplitAmong((prev) => [...prev, newMember.id])
    setNewMemberName('')
  }

  const handleRemoveMember = (id: string) => {
    const memberName = memberById.get(id)?.name ?? 'this member'
    const usedByExpenses = expenses.some(
      (e) => e.paidBy === id || e.splitAmong.includes(id),
    )
    const confirmText = usedByExpenses
      ? `Delete "${memberName}"? They appear in existing expenses — those expenses will also be removed.`
      : `Delete "${memberName}"?`
    if (!window.confirm(confirmText)) return
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setExpenses((prev) =>
      prev.filter((e) => e.paidBy !== id && !e.splitAmong.includes(id)),
    )
    if (filterMember === id) setFilterMember('All')
  }

  const startEditMember = (m: Member) => {
    setEditingMemberId(m.id)
    setEditingMemberName(m.name)
  }

  const saveEditMember = () => {
    const name = editingMemberName.trim()
    if (!editingMemberId || !name) {
      setEditingMemberId(null)
      return
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.id === editingMemberId ? { ...m, name } : m,
      ),
    )
    setEditingMemberId(null)
    setEditingMemberName('')
  }

  const toggleSplitAmong = (id: string) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter((e) => {
      const matchCategory =
        filterCategory === 'All' || e.category === filterCategory
      const matchMember =
        filterMember === 'All' ||
        e.paidBy === filterMember ||
        e.splitAmong.includes(filterMember)
      const matchSearch =
        q === '' || e.description.toLowerCase().includes(q)
      return matchCategory && matchMember && matchSearch
    })
  }, [expenses, filterCategory, filterMember, search])

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  )
  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  )

  const now = new Date()
  const weekStart = startOfWeek(now)

  const weekTotal = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.date) >= weekStart)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, weekStart],
  )

  const { thisMonthTotal, lastMonthTotal } = useMemo(() => {
    const ref = new Date()
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const lastMonthStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
    let thisM = 0
    let lastM = 0
    for (const e of expenses) {
      const d = new Date(e.date)
      if (d >= monthStart) thisM += e.amount
      else if (d >= lastMonthStart && d < monthStart) lastM += e.amount
    }
    return { thisMonthTotal: thisM, lastMonthTotal: lastM }
  }, [expenses])

  const monthChange =
    lastMonthTotal === 0
      ? thisMonthTotal > 0
        ? 100
        : 0
      : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100

  const categoryData = useMemo(() => {
    const byCat = new Map<Category, number>()
    for (const e of expenses) {
      const cat = (CATEGORIES as readonly string[]).includes(e.category)
        ? (e.category as Category)
        : 'Other'
      byCat.set(cat, (byCat.get(cat) ?? 0) + e.amount)
    }
    return Array.from(byCat.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  const dailyData = useMemo(() => {
    const byDate = new Map<string, number>()
    const start = new Date()
    start.setDate(start.getDate() - 13)
    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      byDate.set(key, 0)
    }
    for (const e of expenses) {
      if (byDate.has(e.date)) {
        byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount)
      }
    }
    return Array.from(byDate.entries()).map(([d, amt]) => ({
      date: d.slice(5),
      amount: Math.round(amt * 100) / 100,
    }))
  }, [expenses])

  type MemberStats = {
    member: Member
    paid: number
    share: number
    net: number
    expenseCount: number
  }

  const memberStats = useMemo<MemberStats[]>(() => {
    const paid = new Map<string, number>()
    const share = new Map<string, number>()
    const count = new Map<string, number>()
    for (const m of members) {
      paid.set(m.id, 0)
      share.set(m.id, 0)
      count.set(m.id, 0)
    }
    for (const e of expenses) {
      if (paid.has(e.paidBy)) {
        paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount)
      }
      const splitters = e.splitAmong.filter((id) => share.has(id))
      if (splitters.length > 0) {
        const per = e.amount / splitters.length
        for (const id of splitters) {
          share.set(id, (share.get(id) ?? 0) + per)
          count.set(id, (count.get(id) ?? 0) + 1)
        }
      }
    }
    return members.map((m) => {
      const p = paid.get(m.id) ?? 0
      const s = share.get(m.id) ?? 0
      return {
        member: m,
        paid: Math.round(p * 100) / 100,
        share: Math.round(s * 100) / 100,
        net: Math.round((p - s) * 100) / 100,
        expenseCount: count.get(m.id) ?? 0,
      }
    })
  }, [expenses, members])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                Expense Tracker
              </h1>
              <p className="text-xs text-slate-500">
                Shared expenses in ₹ — track, split, and settle
              </p>
            </div>
          </div>
          <button
            onClick={handleClearAll}
            className="text-sm text-slate-500 hover:text-red-600 transition-colors"
            title="Clear all expenses"
          >
            Clear all
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Summary cards: Total / This week / This month / Top category */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Overall total
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-semibold">
              {formatINR(total)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {expenses.length} expense{expenses.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              This week
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-semibold">
              {formatINR(weekTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Since {weekStart.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              This month
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-semibold">
              {formatINR(thisMonthTotal)}
            </p>
            <p
              className={`mt-1 text-xs flex items-center gap-1 ${
                monthChange >= 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {monthChange >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(monthChange).toFixed(1)}% vs last month
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Top category
            </p>
            <p className="mt-2 text-2xl md:text-3xl font-semibold">
              {categoryData[0]?.name ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {categoryData[0]
                ? formatINR(categoryData[0].value)
                : 'No spending yet'}
            </p>
          </div>
        </section>

        {/* Members card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Users size={18} className="text-indigo-600" /> Members
              <span className="text-xs text-slate-400 font-normal">
                ({members.length})
              </span>
            </h2>
            <form
              onSubmit={handleAddMember}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Add member name"
                className="w-44 px-3 py-1.5 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                <UserPlus size={14} /> Add
              </button>
            </form>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400">
              No members yet. Add one above to start recording expenses.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1 text-sm"
                >
                  {editingMemberId === m.id ? (
                    <>
                      <input
                        autoFocus
                        value={editingMemberName}
                        onChange={(e) => setEditingMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditMember()
                          if (e.key === 'Escape') setEditingMemberId(null)
                        }}
                        className="bg-transparent outline-none text-sm w-24"
                      />
                      <button
                        onClick={saveEditMember}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-full"
                        aria-label="Save member name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="p-1 text-slate-500 hover:bg-slate-200 rounded-full"
                        aria-label="Cancel edit"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{m.name}</span>
                      <button
                        onClick={() => startEditMember(m)}
                        className="p-1 text-slate-500 hover:bg-slate-200 rounded-full"
                        aria-label={`Rename ${m.name}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"
                        aria-label={`Delete ${m.name}`}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add expense + pie chart */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleAddExpense}
            className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" /> Add expense
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, auto, groceries…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      category === c
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                disabled={members.length === 0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                {members.length === 0 ? (
                  <option value="">— add a member first —</option>
                ) : (
                  members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Split among
              </label>
              {members.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Add members to split expenses.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const checked = splitAmong.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSplitAmong(m.id)}
                          className="accent-indigo-600"
                        />
                        {m.name}
                      </label>
                    )
                  })}
                </div>
              )}
              {splitAmong.length > 0 && amount && Number(amount) > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Each pays{' '}
                  <span className="font-medium">
                    {formatINR(Number(amount) / splitAmong.length)}
                  </span>
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={members.length === 0}
              className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-300"
            >
              Add expense
            </button>
          </form>

          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Spending by category</h2>
            {categoryData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Add an expense to see the breakdown
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name as Category]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Per-member breakdown */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-semibold text-lg">Per-member breakdown</h2>
            <p className="text-xs text-slate-500">
              Positive net means the member is owed money; negative means they
              owe.
            </p>
          </div>
          {members.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">Add members first.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3 text-right">Paid</th>
                    <th className="px-6 py-3 text-right">Share</th>
                    <th className="px-6 py-3 text-right">Net</th>
                    <th className="px-6 py-3 text-right">Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((s) => (
                    <tr
                      key={s.member.id}
                      className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                    >
                      <td className="px-6 py-3 font-medium">{s.member.name}</td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        {formatINR(s.paid)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        {formatINR(s.share)}
                      </td>
                      <td
                        className={`px-6 py-3 text-right tabular-nums font-semibold ${
                          s.net > 0
                            ? 'text-emerald-600'
                            : s.net < 0
                              ? 'text-red-600'
                              : 'text-slate-500'
                        }`}
                      >
                        {s.net > 0 ? '+' : ''}
                        {formatINR(s.net)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-500">
                        {s.expenseCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Last 14 days bar chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Last 14 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Expense list */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h2 className="font-semibold text-lg">Expenses</h2>
              <p className="text-xs text-slate-500">
                Showing {filtered.length} of {expenses.length} ·{' '}
                {formatINR(filteredTotal)} total
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description"
                  className="w-full sm:w-48 pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={filterCategory}
                  onChange={(e) =>
                    setFilterCategory(e.target.value as 'All' | Category)
                  }
                  className="w-full sm:w-40 pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Users
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={filterMember}
                  onChange={(e) => setFilterMember(e.target.value)}
                  className="w-full sm:w-40 pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  <option value="All">All members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              {expenses.length === 0
                ? 'No expenses yet. Add your first one above.'
                : 'No expenses match your filters.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const payer = memberById.get(e.paidBy)?.name ?? 'Unknown'
                const splitNames = e.splitAmong
                  .map((id) => memberById.get(id)?.name)
                  .filter((x): x is string => Boolean(x))
                const perShare =
                  splitNames.length > 0 ? e.amount / splitNames.length : e.amount
                return (
                  <li
                    key={e.id}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[e.category as Category] ?? '#6b7280',
                      }}
                    >
                      {e.category.slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {e.category} ·{' '}
                        {new Date(e.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paid by <span className="font-medium">{payer}</span>
                        {splitNames.length > 0 && (
                          <>
                            {' '}· split among{' '}
                            <span className="font-medium">
                              {splitNames.join(', ')}
                            </span>{' '}
                            ({formatINR(perShare)} each)
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">
                      {formatINR(e.amount)}
                    </p>
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      aria-label="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <footer className="text-center text-xs text-slate-400 pt-4 pb-8">
          Your data is stored locally in your browser.
        </footer>
      </main>
    </div>
  )
}

export default App
