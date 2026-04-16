import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { useData } from '../context/DataContext'
import { formatINR, todayISO } from '../lib/format'

type Draft = {
  key: string
  amount: string
  description: string
  categoryId: string
  date: string
  paidBy: string
  splitAmong: string[]
}

type Props = {
  open: boolean
  onClose: () => void
}

const makeDraft = (
  categoryId: string,
  paidBy: string,
  splitAmong: string[],
): Draft => ({
  key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  amount: '',
  description: '',
  categoryId,
  date: todayISO(),
  paidBy,
  splitAmong: [...splitAmong],
})

export function BulkAddModal({ open, onClose }: Props) {
  const { members, categories, addExpense } = useData()
  const defaultCat = categories[0]?.id ?? ''
  const defaultPayer = members[0]?.id ?? ''
  const defaultSplit = useMemo(() => members.map((m) => m.id), [members])

  const [rows, setRows] = useState<Draft[]>(() => [
    makeDraft(defaultCat, defaultPayer, defaultSplit),
    makeDraft(defaultCat, defaultPayer, defaultSplit),
  ])
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setRows([
      makeDraft(defaultCat, defaultPayer, defaultSplit),
      makeDraft(defaultCat, defaultPayer, defaultSplit),
    ])
    setError(null)
  }

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      makeDraft(defaultCat, defaultPayer, defaultSplit),
    ])

  const removeRow = (key: string) =>
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.key !== key),
    )

  const patch = (key: string, changes: Partial<Draft>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...changes } : r)),
    )

  const toggleSplit = (key: string, memberId: string) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        const included = r.splitAmong.includes(memberId)
        return {
          ...r,
          splitAmong: included
            ? r.splitAmong.filter((m) => m !== memberId)
            : [...r.splitAmong, memberId],
        }
      }),
    )

  const validRows = rows.filter((r) => {
    const amt = parseFloat(r.amount)
    return (
      Number.isFinite(amt) &&
      amt > 0 &&
      r.paidBy &&
      r.splitAmong.length > 0 &&
      r.categoryId
    )
  })

  const totalValid = validRows.reduce(
    (s, r) => s + parseFloat(r.amount || '0'),
    0,
  )

  const handleSubmit = () => {
    if (members.length === 0) {
      setError('Add a member first.')
      return
    }
    if (validRows.length === 0) {
      setError('Fill in at least one row (amount, payer, split).')
      return
    }
    for (const r of validRows) {
      const amt = Math.round(parseFloat(r.amount) * 100) / 100
      addExpense({
        amount: amt,
        description: r.description.trim(),
        categoryId: r.categoryId,
        date: r.date,
        paidBy: r.paidBy,
        splitAmong: [...r.splitAmong],
        settledBy: [r.paidBy],
      })
    }
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Bulk add expenses"
      description="Fill in several expenses at once. Rows with missing amounts are skipped."
    >
      <div className="space-y-3">
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {rows.map((r, idx) => {
            const amt = parseFloat(r.amount)
            const perShare =
              Number.isFinite(amt) && amt > 0 && r.splitAmong.length > 0
                ? amt / r.splitAmong.length
                : null
            return (
              <div
                key={r.key}
                className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Row {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    disabled={rows.length <= 1}
                    aria-label={`Remove row ${idx + 1}`}
                    className="rounded-md p-1 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.amount}
                    onChange={(e) => patch(r.key, { amount: e.target.value })}
                    placeholder="Amount ₹"
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <input
                    type="text"
                    value={r.description}
                    onChange={(e) =>
                      patch(r.key, { description: e.target.value })
                    }
                    placeholder="Description (optional)"
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 sm:col-span-2"
                  />
                  <input
                    type="date"
                    value={r.date}
                    onChange={(e) => patch(r.key, { date: e.target.value })}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <select
                    value={r.categoryId}
                    onChange={(e) =>
                      patch(r.key, { categoryId: e.target.value })
                    }
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={r.paidBy}
                    onChange={(e) => patch(r.key, { paidBy: e.target.value })}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        Paid by {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Split:
                  </span>
                  {members.map((m) => {
                    const checked = r.splitAmong.includes(m.id)
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleSplit(r.key, m.id)}
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium transition ${
                          checked
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                        }`}
                      >
                        {m.name}
                      </button>
                    )
                  })}
                  {perShare !== null && (
                    <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                      Each: {formatINR(perShare)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> Add row
        </button>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {validRows.length} of {rows.length}{' '}
            {rows.length === 1 ? 'row' : 'rows'} ready ·{' '}
            <span className="font-semibold tabular-nums">
              {formatINR(totalValid)}
            </span>{' '}
            total
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset()
                onClose()
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={validRows.length === 0}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Save {validRows.length > 0 ? validRows.length : ''} expense
              {validRows.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
