import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  AED: 'en-AE',
  JPY: 'ja-JP',
}

export function formatMoney(value: number, currency = 'INR'): string {
  const locale = LOCALE_BY_CURRENCY[currency] ?? 'en-IN'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(value)
  } catch {
    // Unknown currency code → fall back to INR rendering.
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
  }
}

/**
 * Legacy formatter kept so callers outside React component scope keep
 * working. Always renders ₹ INR. Inside components prefer {@link useMoneyFmt}.
 */
export function formatINR(value: number): string {
  return formatMoney(value, 'INR')
}

/**
 * Hook that returns a formatter bound to the signed-in user's
 * `default_currency` (falls back to INR when no profile is loaded yet).
 */
export function useMoneyFmt(): (value: number) => string {
  const { profile } = useAuth()
  const currency = profile?.default_currency || 'INR'
  return useCallback((value: number) => formatMoney(value, currency), [currency])
}

export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay()
  const diff = (day + 6) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

export function prettyDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
