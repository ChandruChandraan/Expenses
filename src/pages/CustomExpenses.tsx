import { useEffect, useMemo, useState } from 'react'
import { Scale, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useMoneyFmt, prettyDate, todayISO } from '../lib/format'
import { isCustomSplit, perShareFor } from '../lib/settlement'

type ShareDraft = {
  memberId: string
  amount: string
}

export function CustomExpensesPage() {
  const {
    members,
    categories,
    expenses,
    addExpense,
    removeExpense,
    addMember,
  } = useData()
  const fmt = useMoneyFmt()

  const [paidBy, setPaidBy] = useState(() => members[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(
    () => categories[0]?.id ?? '',
  )
  const [date, setDate] = useState(() => todayISO())
  const [description, setDescription] = useState('')
  const [shares, setShares] = useState<ShareDraft[]>(() =>
    members.map((m) => ({ memberId: m.id, amount: '' })),
  )
  const [error, setError] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)

  // Keep shares in sync with members (add new, drop removed) without
  // wiping amounts the user has already typed.
  useEffect(() => {
    setShares((prev) => {
      const byId = new Map(prev.map((s) => [s.memberId, s]))
      return members.map(
        (m) => byId.get(m.id) ?? { memberId: m.id, amount: '' },
      )
    })
  }, [members])

  useEffect(() => {
    if (!members.some((m) => m.id === paidBy)) {
      setPaidBy(members[0]?.id ?? '')
    }
  }, [members, paidBy])

  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [categories, categoryId])

  const parsed = shares.map((s) => {
    const n = parseFloat(s.amount)
    return {
      memberId: s.memberId,
      amount: Number.isFinite(n) && n > 0 ? n : 0,
    }
  })
  const totalAmount = parsed.reduce((s, p) => s + p.amount, 0)
  const includedIds = parsed.filter((p) => p.amount > 0).map((p) => p.memberId)

  const patchShare = (memberId: string, amount: string) =>
    setShares((prev) =>
      prev.map((s) => (s.memberId === memberId ? { ...s, amount } : s)),
    )

  const handleAddMember = async () => {
    const added = await addMember(newMemberName)
    if (!added) {
      setMemberError('Enter a unique name.')
      return
    }
    setShares((prev) => [...prev, { memberId: added.id, amount: '' }])
    setNewMemberName('')
    setMemberError(null)
    setShowAddMember(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (members.length === 0) {
      setError('Add a member first.')
      return
    }
    if (!paidBy) {
      setError('Select who paid.')
      return
    }
    if (!categoryId) {
      setError('Pick a category.')
      return
    }
    if (includedIds.length === 0) {
      setError('Enter an amount for at least one member.')
      return
    }
    if (totalAmount <= 0) {
      setError('Total must be greater than zero.')
      return
    }
    if (!includedIds.includes(paidBy)) {
      setError(
        "Payer must owe a share too — type 0 in someone else's field only. Enter the payer's own share as well (can be 0).",
      )
      return
    }

    const sharesMap: Record<string, number> = {}
    for (const p of parsed) {
      if (p.amount > 0) sharesMap[p.memberId] = Math.round(p.amount * 100) / 100
    }

    addExpense({
      amount: Math.round(totalAmount * 100) / 100,
      description: description.trim(),
      categoryId,
      date,
      paidBy,
      splitAmong: [...includedIds],
      settledBy: [paidBy],
      shares: sharesMap,
    })

    // Reset form but keep payer/category/date context.
    setShares(members.map((m) => ({ memberId: m.id, amount: '' })))
    setDescription('')
  }

  const customExpenses = useMemo(
    () => expenses.filter((e) => isCustomSplit(e)),
    [expenses],
  )

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  )
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Custom expenses
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            One member pays the whole bill — each splitter owes a different
            amount.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Who paid the full bill?
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Description
              </label>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                optional
              </span>
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at Annalakshmi, grocery run..."
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Per-member amount (₹)
            </label>
            {!showAddMember && (
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <UserPlus className="h-3.5 w-3.5" />
                New member
              </button>
            )}
          </div>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {shares.map((s) => {
              const member = memberById.get(s.memberId)
              if (!member) return null
              const isPayer = s.memberId === paidBy
              return (
                <li
                  key={s.memberId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {member.name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className="flex-1 text-sm font-medium">
                    {member.name}
                    {isPayer && (
                      <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        paid upfront
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400 dark:text-neutral-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={s.amount}
                      onChange={(e) =>
                        patchShare(s.memberId, e.target.value)
                      }
                      placeholder="0.00"
                      className="w-28 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      aria-label={`Amount for ${member.name}`}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          {showAddMember && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
                placeholder="New member name"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAddMember()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleAddMember()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberName('')
                  setMemberError(null)
                }}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              {memberError && (
                <span className="w-full text-xs text-rose-600 dark:text-rose-400">
                  {memberError}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800/60">
            <span className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <Scale className="h-4 w-4" />
              {includedIds.length}{' '}
              {includedIds.length === 1 ? 'splitter' : 'splitters'} · total
              bill
            </span>
            <span className="text-base font-semibold tabular-nums">
              {fmt(totalAmount)}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={totalAmount <= 0 || includedIds.length === 0}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Save custom expense
          </button>
        </div>
      </form>

      <div className="card overflow-hidden p-0">
        <div className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-5">
          <div className="text-sm font-medium">
            Saved custom expenses ({customExpenses.length})
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Only expenses with uneven splits appear here.
          </div>
        </div>
        {customExpenses.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No custom expenses yet. Add one above and it will show here.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {customExpenses.map((e) => {
              const cat = catById.get(e.categoryId)
              const payer = memberById.get(e.paidBy)?.name ?? 'Unknown'
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 px-3 py-3 sm:px-5"
                >
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: cat?.color ?? '#64748b' }}
                  >
                    {cat?.name?.[0] ?? '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate font-medium">
                            {e.description || (
                              <span className="text-neutral-400 dark:text-neutral-500">
                                No description
                              </span>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <SlidersHorizontal className="h-3 w-3" />
                            Custom split
                          </span>
                        </div>
                      </div>
                      <div className="flex-none text-right text-sm font-semibold tabular-nums sm:text-base">
                        {fmt(e.amount)}
                      </div>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {cat?.name ?? 'Uncategorized'} · {prettyDate(e.date)} ·
                      paid by {payer}
                    </div>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {e.splitAmong.map((sid) => {
                        const m = memberById.get(sid)
                        const share = perShareFor(e, sid)
                        return (
                          <li
                            key={sid}
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            <span className="font-medium">
                              {m?.name ?? 'Unknown'}
                            </span>
                            <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                              {fmt(share)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => removeExpense(e.id)}
                      aria-label="Delete custom expense"
                      className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-neutral-500 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
