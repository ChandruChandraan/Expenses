import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useData } from '../context/DataContext'
import { formatINR, startOfWeek } from '../lib/format'
import { perShareFor } from '../lib/settlement'
import { MemberDetailsModal } from '../components/MemberDetailsModal'
import { SettlementDetailsModal } from '../components/SettlementDetailsModal'
import type { Member } from '../lib/types'

type RangeKey = '1d' | '7d' | '30d' | '90d' | 'all'
const RANGE_LABEL: Record<RangeKey, string> = {
  '1d': 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}
const RANGE_DAYS: Record<RangeKey, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 0,
}

export function DashboardPage() {
  const { expenses, categories, members } = useData()
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const [settleFilter, setSettleFilter] = useState<
    'pending' | 'settled' | null
  >(null)
  const [rangeKey, setRangeKey] = useState<RangeKey>('7d')

  const stats = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    )

    let total = 0
    let week = 0
    let thisMonth = 0
    let lastMonth = 0
    const byCategory = new Map<string, number>()
    const byDay = new Map<string, number>()

    for (const e of expenses) {
      total += e.amount
      const d = new Date(e.date)
      if (d >= weekStart) week += e.amount
      if (d >= monthStart) thisMonth += e.amount
      else if (d >= lastMonthStart && d < monthStart) lastMonth += e.amount
      byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount)
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount)
    }

    const topCat = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]
    const mom =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null

    const pie = categories
      .map((c) => ({
        name: c.name,
        value: byCategory.get(c.id) ?? 0,
        color: c.color,
      }))
      .filter((p) => p.value > 0)

    const windowDays = RANGE_DAYS[rangeKey]
    const days: { date: string; amount: number }[] = []
    if (windowDays > 0) {
      for (let i = windowDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        days.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          amount: byDay.get(key) ?? 0,
        })
      }
    } else {
      const keys = [...byDay.keys()].sort()
      for (const key of keys) {
        const [, mm, dd] = key.split('-')
        days.push({
          date: `${parseInt(mm, 10)}/${parseInt(dd, 10)}`,
          amount: byDay.get(key) ?? 0,
        })
      }
    }
    const rangeTotal = days.reduce((s, d) => s + d.amount, 0)

    return {
      total,
      week,
      thisMonth,
      lastMonth,
      mom,
      topCat,
      pie,
      days,
      rangeTotal,
      weekStartLabel: weekStart.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
    }
  }, [expenses, categories, rangeKey])

  const memberStats = useMemo(() => {
    const paid = new Map<string, number>()
    const share = new Map<string, number>()
    const pending = new Map<string, number>()
    for (const m of members) {
      paid.set(m.id, 0)
      share.set(m.id, 0)
      pending.set(m.id, 0)
    }
    for (const e of expenses) {
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount)
      const valid = e.splitAmong.filter((id) => share.has(id))
      for (const id of valid) {
        const per = perShareFor(e, id)
        share.set(id, (share.get(id) ?? 0) + per)
        if (!e.settledBy.includes(id)) {
          pending.set(id, (pending.get(id) ?? 0) + per)
        }
      }
    }
    return members.map((m) => ({
      member: m,
      paid: Math.round((paid.get(m.id) ?? 0) * 100) / 100,
      share: Math.round((share.get(m.id) ?? 0) * 100) / 100,
      pending: Math.round((pending.get(m.id) ?? 0) * 100) / 100,
      net:
        Math.round(((paid.get(m.id) ?? 0) - (share.get(m.id) ?? 0)) * 100) /
        100,
    }))
  }, [expenses, members])

  const settlement = useMemo(() => {
    let totalPending = 0
    let totalSettled = 0
    let pendingCount = 0
    for (const e of expenses) {
      let hasPending = false
      for (const id of e.splitAmong) {
        const per = perShareFor(e, id)
        if (e.settledBy.includes(id)) totalSettled += per
        else {
          totalPending += per
          hasPending = true
        }
      }
      if (hasPending) pendingCount += 1
    }
    return {
      totalPending: Math.round(totalPending * 100) / 100,
      totalSettled: Math.round(totalSettled * 100) / 100,
      pendingCount,
    }
  }, [expenses])

  const topCategoryName =
    stats.topCat != null
      ? categories.find((c) => c.id === stats.topCat?.[0])?.name ?? '—'
      : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Overview of shared spends in INR.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Overall total"
          value={formatINR(stats.total)}
          sub={`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`}
          accent="indigo"
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryCard
          label="This week"
          value={formatINR(stats.week)}
          sub={`Since ${stats.weekStartLabel}`}
          accent="sky"
        />
        <SummaryCard
          label="This month"
          value={formatINR(stats.thisMonth)}
          sub={
            stats.mom == null
              ? 'No data last month'
              : `${stats.mom >= 0 ? '+' : ''}${stats.mom.toFixed(1)}% vs last month`
          }
          trend={stats.mom ?? undefined}
          accent="emerald"
        />
        <SummaryCard
          label="Top category"
          value={topCategoryName}
          sub={stats.topCat ? formatINR(stats.topCat[1]) : '—'}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Pending to collect"
          value={formatINR(settlement.totalPending)}
          sub={
            settlement.pendingCount === 0
              ? 'Everyone is settled up'
              : `${settlement.pendingCount} ${settlement.pendingCount === 1 ? 'expense' : 'expenses'} waiting · tap for details`
          }
          accent="amber"
          onClick={() => setSettleFilter('pending')}
        />
        <SummaryCard
          label="Already settled"
          value={formatINR(settlement.totalSettled)}
          sub={`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} tracked · tap for details`}
          accent="emerald"
          onClick={() => setSettleFilter('settled')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">
              Spend over time
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {formatINR(stats.rangeTotal)} in range
              </span>
              <select
                value={rangeKey}
                onChange={(e) => setRangeKey(e.target.value as RangeKey)}
                aria-label="Chart time range"
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                  <option key={k} value={k}>
                    {RANGE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.days}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                  width={50}
                  tickFormatter={(v) => formatINR(v).replace(/\.00$/, '')}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number) => formatINR(v)}
                />
                <Bar
                  dataKey="amount"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold tracking-tight">
            Spending by category
          </h2>
          {stats.pie.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No expenses yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pie}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stats.pie.map((p) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => formatINR(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 text-base font-semibold tracking-tight">
          Per-member breakdown
        </h2>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          Positive net = owed money · negative net = owes money.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="py-2 pr-4 font-medium">Member</th>
                <th className="py-2 pr-4 text-right font-medium">Paid</th>
                <th className="py-2 pr-4 text-right font-medium">Share</th>
                <th className="py-2 pr-4 text-right font-medium">Pending</th>
                <th className="py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {memberStats.map((s) => (
                <tr
                  key={s.member.id}
                  onClick={() => setDetailMember(s.member)}
                  className="cursor-pointer transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <td className="py-2 pr-4 font-medium">
                    <span className="inline-flex items-center gap-1">
                      {s.member.name}
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatINR(s.paid)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatINR(s.share)}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right tabular-nums ${
                      s.pending > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {formatINR(s.pending)}
                  </td>
                  <td
                    className={`py-2 text-right font-semibold tabular-nums ${
                      s.net > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : s.net < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {s.net > 0 ? '+' : ''}
                    {formatINR(s.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Tap any row to see the full settlement breakdown.
        </p>
      </section>

      <MemberDetailsModal
        member={detailMember}
        onClose={() => setDetailMember(null)}
      />

      <SettlementDetailsModal
        open={settleFilter !== null}
        filter={settleFilter ?? 'pending'}
        onClose={() => setSettleFilter(null)}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  trend,
  accent = 'indigo',
  icon,
  onClick,
}: {
  label: string
  value: string
  sub?: string
  trend?: number
  accent?: 'indigo' | 'sky' | 'emerald' | 'amber'
  icon?: React.ReactNode
  onClick?: () => void
}) {
  const accents: Record<string, string> = {
    indigo:
      'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    sky: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
    emerald:
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    amber:
      'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  }
  const clickable = Boolean(onClick)
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`card ${clickable ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        {icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${accents[accent]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && (
        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
          {trend != null &&
            (trend >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            ))}
          {sub}
        </div>
      )}
    </div>
  )
}
