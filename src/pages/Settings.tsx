import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { CATEGORY_COLORS } from '../lib/storage'
import { Modal } from '../components/Modal'
import { useTheme } from '../context/ThemeContext'

export function SettingsPage() {
  const { categories, expenses, addCategory, removeCategory } = useData()
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const countByCategory = categories.map((c) => ({
    ...c,
    count: expenses.filter((e) => e.categoryId === c.id).length,
  }))

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const added = addCategory(name, color)
    if (!added) {
      setError('Enter a unique name.')
      return
    }
    setName('')
    setColor(CATEGORY_COLORS[0])
    setError(null)
    setOpen(false)
  }

  const handleDelete = (id: string, name: string, count: number) => {
    if (categories.length <= 1) {
      alert('Keep at least one category.')
      return
    }
    const msg =
      count > 0
        ? `Delete "${name}"? ${count} ${
            count === 1 ? 'expense is' : 'expenses are'
          } using it — they will be moved to another category.`
        : `Delete "${name}"?`
    if (confirm(msg)) removeCategory(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Appearance and categories.
        </p>
      </div>

      <section className="card">
        <h2 className="text-base font-semibold tracking-tight">Appearance</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Choose how Expense Tracker looks. The header toggle also switches
          themes.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xs">
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              mode === 'light'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              mode === 'dark'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
            }`}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Categories
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Add your own categories and pick a color. Used when adding
              expenses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Plus className="h-4 w-4" />
            New category
          </button>
        </div>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {countByCategory.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span
                className="h-4 w-4 flex-none rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <div className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {c.count} {c.count === 1 ? 'expense' : 'expenses'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id, c.name, c.count)}
                aria-label={`Delete ${c.name}`}
                className="rounded-md p-2 text-neutral-500 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
        title="New category"
        description="Give it a name and pick a color."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Groceries, Fuel, Rent..."
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Pick color ${c}`}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color === c
                      ? 'border-neutral-900 dark:border-white'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Add category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
