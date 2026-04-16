import { useMemo } from 'react'
import { Modal } from './Modal'
import { StatusSelect } from './StatusSelect'
import { useData } from '../context/DataContext'
import { formatINR, prettyDate } from '../lib/format'
import type { Expense, Member } from '../lib/types'

type Props = {
  member: Member | null
  onClose: () => void
}

type Row = {
  expense: Expense
  counterpart: string
  share: number
  paid: boolean
  splitterId: string
}

export function MemberDetailsModal({ member, onClose }: Props) {
  const { expenses, members, categories, togglePaid } = useData()

  const { owes, owed } = useMemo(() => {
    const owesList: Row[] = []
    const owedList: Row[] = []
    if (!member) return { owes: owesList, owed: owedList }

    const nameOf = (id: string) =>
      members.find((m) => m.id === id)?.name ?? 'Unknown'

    for (const e of expenses) {
      const valid = e.splitAmong.filter((id) =>
        members.some((m) => m.id === id),
      )
      if (valid.length === 0) continue
      const per = e.amount / valid.length

      // Money THIS member needs to pay to others
      if (
        valid.includes(member.id) &&
        e.paidBy !== member.id &&
        !e.settledBy.includes(member.id)
      ) {
        owesList.push({
          expense: e,
          counterpart: nameOf(e.paidBy),
          share: per,
          paid: false,
          splitterId: member.id,
        })
      }

      // Money OWED to this member (they paid, others haven't settled)
      if (e.paidBy === member.id) {
        for (const sid of valid) {
          if (sid === member.id) continue
          if (e.settledBy.includes(sid)) continue
          owedList.push({
            expense: e,
            counterpart: nameOf(sid),
            share: per,
            paid: false,
            splitterId: sid,
          })
        }
      }
    }

    return { owes: owesList, owed: owedList }
  }, [member, expenses, members])

  const totalOwes = owes.reduce((s, r) => s + r.share, 0)
  const totalOwed = owed.reduce((s, r) => s + r.share, 0)
  const net = totalOwed - totalOwes
  const catById = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c]))
    return m
  }, [categories])

  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      title={member ? `${member.name} · settlement details` : ''}
      description="Who this member needs to pay and who owes them money."
    >
      {member && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Will pay"
              value={formatINR(totalOwes)}
              tone="amber"
            />
            <SummaryTile
              label="Owed to them"
              value={formatINR(totalOwed)}
              tone="emerald"
            />
            <SummaryTile
              label="Net"
              value={`${net > 0 ? '+' : ''}${formatINR(net)}`}
              tone={net > 0 ? 'emerald' : net < 0 ? 'rose' : 'neutral'}
            />
          </div>

          <Section
            title={`${member.name} will pay`}
            emptyLabel={`${member.name} has no pending shares to pay.`}
            rows={owes}
            rowSubtitle={(r) => `to ${r.counterpart}`}
            catById={catById}
            onChange={(r, next) => {
              if (next === 'paid') togglePaid(r.expense.id, member.id)
            }}
          />

          <Section
            title={`Others will pay ${member.name}`}
            emptyLabel={`No one owes ${member.name} right now.`}
            rows={owed}
            rowSubtitle={(r) => `from ${r.counterpart}`}
            catById={catById}
            onChange={(r, next) => {
              if (next === 'paid') togglePaid(r.expense.id, r.splitterId)
            }}
          />

          <div className="flex justify-end pt-1">
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

type Tone = 'amber' | 'emerald' | 'rose' | 'neutral'

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: Tone
}) {
  const toneMap: Record<Tone, string> = {
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-neutral-700 dark:text-neutral-200',
  }
  return (
    <div className="rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60">
      <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneMap[tone]}`}>
        {value}
      </div>
    </div>
  )
}

function Section({
  title,
  emptyLabel,
  rows,
  rowSubtitle,
  catById,
  onChange,
}: {
  title: string
  emptyLabel: string
  rows: Row[]
  rowSubtitle: (row: Row) => string
  catById: Map<string, { id: string; name: string; color: string }>
  onChange: (row: Row, next: 'paid' | 'pending') => void
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
          {emptyLabel}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {rows.map((r, i) => {
            const cat = catById.get(r.expense.categoryId)
            return (
              <li
                key={`${r.expense.id}-${r.splitterId}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[10px] font-semibold text-white"
                  style={{ backgroundColor: cat?.color ?? '#64748b' }}
                >
                  {cat?.name?.[0] ?? '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.expense.description || (
                      <span className="text-neutral-400 dark:text-neutral-500">
                        No description
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {rowSubtitle(r)} · {cat?.name ?? 'Uncategorized'} ·{' '}
                    {prettyDate(r.expense.date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatINR(r.share)}
                  </span>
                  <StatusSelect
                    value={r.paid ? 'paid' : 'pending'}
                    onChange={(next) => onChange(r, next)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
