import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
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

type Expense = {
  id: string
  amount: number
  description: string
  category: string
  date: string
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

const STORAGE_KEY = 'expense-tracker:v1'

function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Food')
  const [date, setDate] = useState<string>(todayISO())
  const [filterCategory, setFilterCategory] = useState<'All' | Category>('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = parseFloat(amount)
    if (!description.trim()) {
      setError('Please enter a description.')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      category,
      date,
    }
    setExpenses((prev) => [newExpense, ...prev])
    setAmount('')
    setDescription('')
    setCategory('Food')
    setDate(todayISO())
    setError(null)
  }

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const handleClearAll = () => {
    if (expenses.length === 0) return
    const ok = window.confirm('Delete all expenses? This cannot be undone.')
    if (ok) setExpenses([])
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchCategory =
        filterCategory === 'All' || e.category === filterCategory
      const matchSearch =
        search.trim() === '' ||
        e.description.toLowerCase().includes(search.trim().toLowerCase())
      return matchCategory && matchSearch
    })
  }, [expenses, filterCategory, search])

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered],
  )

  const { thisMonthTotal, lastMonthTotal } = useMemo(() => {
    const now = new Date()
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    let thisM = 0
    let lastM = 0
    for (const e of expenses) {
      const d = new Date(e.date)
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      ) {
        thisM += e.amount
      } else if (
        d.getFullYear() === last.getFullYear() &&
        d.getMonth() === last.getMonth()
      ) {
        lastM += e.amount
      }
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
    return Array.from(byDate.entries()).map(([date, amount]) => ({
      date: date.slice(5),
      amount: Math.round(amount * 100) / 100,
    }))
  }, [expenses])

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
                Track your spending, stay on budget
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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total tracked
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {expenses.length} expense{expenses.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              This month
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {formatCurrency(thisMonthTotal)}
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
            <p className="mt-2 text-3xl font-semibold">
              {categoryData[0]?.name ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {categoryData[0]
                ? formatCurrency(categoryData[0].value)
                : 'No spending yet'}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleAdd}
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
                placeholder="Lunch, Uber ride, groceries…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Amount
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors shadow-sm"
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
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Last 14 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h2 className="font-semibold text-lg">Expenses</h2>
              <p className="text-xs text-slate-500">
                Showing {filtered.length} of {expenses.length} ·{' '}
                {formatCurrency(total)} total
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
                  className="w-full sm:w-56 pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                  className="w-full sm:w-44 pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
              {filtered.map((e) => (
                <li
                  key={e.id}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
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
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(e.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                    aria-label="Delete expense"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
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
