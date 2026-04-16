import { ChevronDown } from 'lucide-react'

export type PaidStatus = 'paid' | 'pending'

type Props = {
  value: PaidStatus
  disabled?: boolean
  onChange: (next: PaidStatus) => void
  ariaLabel?: string
}

export function StatusSelect({ value, disabled, onChange, ariaLabel }: Props) {
  const tone =
    value === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
      : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
  return (
    <div
      className={`relative inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        disabled
          ? 'cursor-not-allowed bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700'
          : tone
      }`}
    >
      <select
        aria-label={ariaLabel ?? 'Payment status'}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PaidStatus)}
        className="appearance-none bg-transparent pr-4 pl-0 text-xs font-medium focus:outline-none disabled:cursor-not-allowed"
      >
        <option value="paid">Paid</option>
        <option value="pending">Pending</option>
      </select>
      <ChevronDown className="pointer-events-none -ml-3 h-3.5 w-3.5 opacity-70" />
    </div>
  )
}
