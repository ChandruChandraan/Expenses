import { Modal } from './Modal'
import { StatusSelect } from './StatusSelect'
import { useData } from '../context/DataContext'
import { useMoneyFmt, prettyDate } from '../lib/format'
import { isCustomSplit, perShareFor } from '../lib/settlement'
import type { Expense } from '../lib/types'

type Props = {
  expense: Expense | null
  onClose: () => void
}

export function SettleModal({ expense, onClose }: Props) {
  const { members, categories, togglePaid, markAllPaid, markAllPending } =
    useData()
  const fmt = useMoneyFmt()

  const payer = expense
    ? members.find((m) => m.id === expense.paidBy)?.name ?? 'Unknown'
    : ''
  const category = expense
    ? categories.find((c) => c.id === expense.categoryId)
    : null
  const custom = expense ? isCustomSplit(expense) : false
  const paidCount = expense?.settledBy.length ?? 0
  const totalCount = expense?.splitAmong.length ?? 0
  const pendingAmount = expense
    ? expense.splitAmong.reduce(
        (sum, id) =>
          sum + (expense.settledBy.includes(id) ? 0 : perShareFor(expense, id)),
        0,
      )
    : 0
  const allSettled =
    expense != null && paidCount === totalCount && totalCount > 0

  return (
    <Modal
      open={expense !== null}
      onClose={onClose}
      title="Payment status"
      description={
        expense
          ? `${expense.description || 'Expense'} · ${prettyDate(expense.date)}`
          : ''
      }
    >
      {expense && (
        <div className="space-y-4">
          <div className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60">
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {category?.name ?? 'Uncategorized'} · paid by {payer}
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {fmt(expense.amount)}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>
                {custom
                  ? 'Custom split'
                  : 'Each share:'}{' '}
                {!custom && (
                  <span className="font-semibold tabular-nums">
                    {fmt(perShareFor(expense, expense.splitAmong[0]))}
                  </span>
                )}
              </span>
              <span
                className={
                  allSettled
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : 'font-medium text-amber-600 dark:text-amber-400'
                }
              >
                {paidCount} of {totalCount} paid ·{' '}
                {allSettled
                  ? 'fully settled'
                  : `${fmt(pendingAmount)} pending`}
              </span>
            </div>
          </div>

          <ul className="space-y-2">
            {expense.splitAmong.map((id) => {
              const member = members.find((m) => m.id === id)
              const isPayer = id === expense.paidBy
              const isPaid = expense.settledBy.includes(id)
              const share = perShareFor(expense, id)
              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <div>
                    <div className="font-medium">
                      {member?.name ?? 'Unknown'}
                      {isPayer && (
                        <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                          paid upfront
                        </span>
                      )}
                    </div>
                    <div className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      Owes {fmt(share)}
                    </div>
                  </div>
                  <StatusSelect
                    value={isPaid ? 'paid' : 'pending'}
                    disabled={isPayer}
                    onChange={(next) => {
                      const nowPaid = next === 'paid'
                      if (nowPaid !== isPaid) togglePaid(expense.id, id)
                    }}
                  />
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => markAllPaid(expense.id)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                Mark all paid
              </button>
              <button
                type="button"
                onClick={() => markAllPending(expense.id)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Reset to pending
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
