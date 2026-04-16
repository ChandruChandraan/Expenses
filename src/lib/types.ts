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
}

export type ThemeMode = 'light' | 'dark'
