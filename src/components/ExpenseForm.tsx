import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatINR, todayISO } from '../lib/format'

type Props = {
  onSubmitted: () => void
  onCancel: () => void
}

export function ExpenseForm({ onSubmitted, onCancel }: Props) {
  const { members, categories, addExpense } = useData()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => todayISO())
  const [categoryId, setCategoryId] = useState(() => categories[0]?.id ?? '')
  const [paidBy, setPaidBy] = useState(() => members[0]?.id ?? '')
  const [splitAmong, setSplitAmong] = useState<string[]>(() =>
    members.map((m) => m.id),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  useEffect(() => {
    if (!members.some((m) => m.id === paidBy)) {
      setPaidBy(members[0]?.id ?? '')
    }
    setSplitAmong((prev) => prev.filter((id) => members.some((m) => m.id === id)))
  }, [members, paidBy])

  const numericAmount = parseFloat(amount)
  const perShare = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null
    if (splitAmong.length === 0) return null
    return numericAmount / splitAmong.length
  }, [numericAmount, splitAmong])

  const toggleSplit = (id: string) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (members.length === 0) {
      setError('Add a member first.')
      return
    }
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a positive amount.')
      return
    }
    if (!paidBy) {
      setError('Select who paid.')
      return
    }
    if (splitAmong.length === 0) {
      setError('Select at least one person to split with.')
      return
    }
    if (!categoryId) {
      setError('Pick a category.')
      return
    }
    addExpense({
      amount: Math.round(numericAmount * 100) / 100,
      description: description.trim(),
      categoryId,
      date,
      paidBy,
      splitAmong: [...splitAmong],
    })
    onSubmitted()
  }

  const paidByName = members.find((m) => m.id === paidBy)?.name

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Who paid?
        </div>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="mt-1 w-full bg-transparent text-lg font-semibold text-neutral-900 focus:outline-none dark:text-neutral-50"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, auto, groceries..."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = categoryId === c.id
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-transparent bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600'
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Split among
        </label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const checked = splitAmong.includes(m.id)
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
                  checked
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-indigo-600"
                  checked={checked}
                  onChange={() => toggleSplit(m.id)}
                />
                {m.name}
              </label>
            )
          })}
        </div>
        {perShare !== null && (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Each pays <span className="font-medium">{formatINR(perShare)}</span>
            {paidByName ? ` · ${paidByName} paid the full amount` : ''}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Save expense
        </button>
      </div>
    </form>
  )
}
