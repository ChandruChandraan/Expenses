import { useMemo } from 'react'
import { Modal } from './Modal'
import { StatusSelect } from './StatusSelect'
import { useData } from '../context/DataContext'
import { useMoneyFmt, prettyDate } from '../lib/format'
import { isCustomSplit, perShareFor } from '../lib/settlement'

type Filter = 'pending' | 'settled'

type Props = {
  open: boolean
  filter: Filter
  onClose: () => void
}

export function SettlementDetailsModal({ open, filter, onClose }: Props) {
  const { expenses, members, categories, togglePaid } = useData()
  const fmt = useMoneyFmt()

  const rows = useMemo(() => {
    const memberName = (id: string) =>
      members.find((m) => m.id === id)?.name ?? 'Unknown'
    const catById = new Map(categories.map((c) => [c.id, c]))

    return expenses
      .map((e) => {
        const splitters = e.splitAmong.map((sid) => ({
          id: sid,
          name: memberName(sid),
          paid: e.settledBy.includes(sid),
          share: perShareFor(e, sid),
          valid: members.some((m) => m.id === sid),
        }))
        const pendingCount = splitters.filter((s) => !s.paid).length
        const paidCount = splitters.filter((s) => s.paid).length
        const pendingAmount = splitters
          .filter((s) => !s.paid)
          .reduce((s, r) => s + r.share, 0)
        const settledAmount = splitters
          .filter((s) => s.paid)
          .reduce((s, r) => s + r.share, 0)
        return {
          expense: e,
          cat: catById.get(e.categoryId),
          payer: memberName(e.paidBy),
          custom: isCustomSplit(e),
          splitters,
          pendingCount,
          paidCount,
          pendingAmount,
          settledAmount,
        }
      })
      .filter((r) =>
        filter === 'pending' ? r.pendingCount > 0 : r.paidCount > 0,
      )
  }, [expenses, members, categories, filter])

  const total =
    filter === 'pending'
      ? rows.reduce((s, r) => s + r.pendingAmount, 0)
      : rows.reduce((s, r) => s + r.settledAmount, 0)

  const title =
    filter === 'pending'
      ? `Pending settlements · ${fmt(total)}`
      : `Already settled · ${fmt(total)}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        filter === 'pending'
          ? 'Every expense with at least one splitter still owing. Flip the dropdown next to a splitter to mark them paid.'
          : 'Every expense with at least one splitter already paid. You can flip anyone back to pending if needed.'
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {filter === 'pending'
            ? 'Nothing pending — everyone is fully settled.'
            : 'Nothing settled yet.'}
        </p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li
              key={r.expense.id}
              className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[11px] font-semibold text-white"
                  style={{ backgroundColor: r.cat?.color ?? '#64748b' }}
                >
                  {r.cat?.name?.[0] ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {r.expense.description || (
                        <span className="text-neutral-400 dark:text-neutral-500">
                          No description
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt(r.expense.amount)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {r.cat?.name ?? 'Uncategorized'} ·{' '}
                    {prettyDate(r.expense.date)} · paid by {r.payer} ·{' '}
                    {r.custom
                      ? 'custom split'
                      : `${fmt(r.splitters[0]?.share ?? 0)} each`}
                    {' · '}
                    <span
                      className={
                        r.pendingCount > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }
                    >
                      {r.paidCount}/{r.splitters.length} paid
                    </span>
                  </div>
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.splitters.map((s) => {
                  const isPayer = s.id === r.expense.paidBy
                  return (
                    <li
                      key={s.id}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                        {fmt(s.share)}
                      </span>
                      <StatusSelect
                        value={s.paid ? 'paid' : 'pending'}
                        disabled={isPayer}
                        onChange={(next) => {
                          const nowPaid = next === 'paid'
                          if (nowPaid !== s.paid)
                            togglePaid(r.expense.id, s.id)
                        }}
                        ariaLabel={`${s.name} status`}
                      />
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}
