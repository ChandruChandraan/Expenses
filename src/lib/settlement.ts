import type { Expense } from './types'

/**
 * How much a given splitter owes for a single expense.
 * Uses `shares[memberId]` when the expense was created with a custom split,
 * otherwise falls back to an equal share.
 */
export function perShareFor(expense: Expense, memberId: string): number {
  if (expense.shares && expense.shares[memberId] != null) {
    return expense.shares[memberId]
  }
  if (expense.splitAmong.length === 0) return 0
  return expense.amount / expense.splitAmong.length
}

export function isCustomSplit(expense: Expense): boolean {
  return Boolean(expense.shares && Object.keys(expense.shares).length > 0)
}

export function pendingAmountFor(expense: Expense): number {
  let total = 0
  for (const id of expense.splitAmong) {
    if (!expense.settledBy.includes(id)) total += perShareFor(expense, id)
  }
  return total
}

export function settledAmountFor(expense: Expense): number {
  let total = 0
  for (const id of expense.splitAmong) {
    if (expense.settledBy.includes(id)) total += perShareFor(expense, id)
  }
  return total
}
