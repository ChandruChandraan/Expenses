import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleDollarSign,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { formatINR, prettyDate } from '../lib/format'
import { Modal } from '../components/Modal'
import { ExpenseForm } from '../components/ExpenseForm'
import { SettleModal } from '../components/SettleModal'
import { BulkAddModal } from '../components/BulkAddModal'
import { ConfirmModal } from '../components/ConfirmModal'
import type { Expense } from '../lib/types'

export function ExpensesPage() {
  const { expenses, members, categories, removeExpense, clearAllExpenses } =
    useData()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>('All')
  const [memberId, setMemberId] = useState<string>('All')
  const [open, setOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [settling, setSettling] = useState<Expense | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter((e) => {
      const matchCat = categoryId === 'All' || e.categoryId === categoryId
      const matchMem =
        memberId === 'All' ||
        e.paidBy === memberId ||
        e.splitAmong.includes(memberId)
      const matchQ = q === '' || e.description.toLowerCase().includes(q)
      return matchCat && matchMem && matchQ
    })
  }, [expenses, search, categoryId, memberId])

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  )

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Search, filter, and manage every spend.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (expenses.length === 0) return
              setClearConfirmOpen(true)
            }}
            disabled={expenses.length === 0}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Layers className="h-4 w-4" />
            Bulk add
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Plus className="h-4 w-4" />
            Add expense
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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

      <div className="card overflow-hidden p-0">
        <div className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-5">
          <div className="text-sm font-medium">
            Showing {filtered.length} of {expenses.length}
          </div>
          <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
            {formatINR(filteredTotal)} total
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {expenses.length === 0
              ? 'No expenses yet — tap “Add expense” to get started.'
              : 'No expenses match the current filters.'}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filtered.map((e) => {
              const cat = catById.get(e.categoryId)
              const payer = memberById.get(e.paidBy)?.name ?? 'Unknown'
              const splitters = e.splitAmong
                .map((id) => memberById.get(id)?.name ?? '?')
                .join(', ')
              const per = e.amount / Math.max(e.splitAmong.length, 1)
              const paidCount = e.settledBy.length
              const totalCount = e.splitAmong.length
              const fullySettled =
                totalCount > 0 && paidCount === totalCount
              const pendingAmount = per * (totalCount - paidCount)
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: cat?.color ?? '#64748b' }}
                  >
                    {cat?.name?.[0] ?? '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">
                        {e.description || (
                          <span className="text-neutral-400 dark:text-neutral-500">
                            No description
                          </span>
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          fullySettled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}
                      >
                        {fullySettled ? (
                          <>
                            <BadgeCheck className="h-3 w-3" />
                            Settled
                          </>
                        ) : (
                          <>
                            <CircleDollarSign className="h-3 w-3" />
                            {formatINR(pendingAmount)} pending
                          </>
                        )}
                      </span>
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {cat?.name ?? 'Uncategorized'} · {prettyDate(e.date)}
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      Paid by {payer} · split among {splitters} (
                      {formatINR(per)} each) · {paidCount}/{totalCount} paid
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="font-semibold tabular-nums">
                      {formatINR(e.amount)}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-neutral-400">
                      <button
                        type="button"
                        onClick={() => setSettling(e)}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400"
                        aria-label="Payment status"
                        title="Payment status"
                      >
                        <CircleDollarSign className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        aria-label="Edit expense"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExpense(e.id)}
                        className="hover:text-rose-600 dark:hover:text-rose-400"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        description="Record a shared spend and choose who splits the bill."
      >
        <ExpenseForm
          onSubmitted={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit expense"
        description="Update amount, who paid, or how it splits."
      >
        {editing && (
          <ExpenseForm
            initial={editing}
            onSubmitted={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <SettleModal
        expense={
          settling
            ? expenses.find((e) => e.id === settling.id) ?? null
            : null
        }
        onClose={() => setSettling(null)}
      />

      <BulkAddModal open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <ConfirmModal
        open={clearConfirmOpen}
        title="Delete all expenses?"
        description={`This will permanently remove all ${expenses.length} expenses. Members and categories stay intact. This action cannot be undone.`}
        confirmLabel="Yes, delete all"
        cancelLabel="No, keep them"
        tone="danger"
        onConfirm={clearAllExpenses}
        onClose={() => setClearConfirmOpen(false)}
      />
    </div>
  )
}
