import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Plus, Wallet } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { Modal } from './Modal'
import { ExpenseForm } from './ExpenseForm'
import { useAuth } from '../context/AuthContext'
import { deriveDisplayName } from '../lib/profile'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/expenses', label: 'Expenses', end: false },
  { to: '/custom', label: 'Custom', end: false },
  { to: '/members', label: 'Members', end: false },
  { to: '/profile', label: 'Profile', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const { state, profile, signOut } = useAuth()
  const email = state.status === 'signed-in' ? state.user.email ?? '' : ''
  const displayName = deriveDisplayName(profile, email)
  const avatar = profile?.avatar_url || ''
  const initial = (displayName.trim().charAt(0) || '?').toUpperCase()
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/70 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/70">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold tracking-tight">
              Expense Tracker
            </div>
          </div>

          <nav className="ml-4 hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {email && (
              <NavLink
                to="/profile"
                title={email}
                className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 md:inline-flex"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="h-6 w-6 flex-none rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                    {initial}
                  </span>
                )}
                <span className="max-w-[120px] truncate font-medium">
                  Hi, {displayName}
                </span>
              </NavLink>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add expense</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        description="Record a shared spend and choose who splits the bill."
      >
        <ExpenseForm
          onSubmitted={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  )
}
