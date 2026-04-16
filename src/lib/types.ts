export type Member = {
  id: string
  name: string
}

export type Category = {
  id: string
  name: string
  color: string
}

export type Expense = {
  id: string
  amount: number
  description: string
  categoryId: string
  date: string
  paidBy: string
  splitAmong: string[]
  settledBy: string[]
  /**
   * Optional per-member amounts. When present, splitters owe exactly
   * `shares[memberId]` instead of the default `amount / splitAmong.length`.
   * Used by the Custom Expenses page for uneven splits.
   */
  shares?: Record<string, number>
}

export type ThemeMode = 'light' | 'dark'
