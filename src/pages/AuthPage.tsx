import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'sign-in' | 'sign-up'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    if (mode === 'sign-up' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    const fn = mode === 'sign-in' ? signIn : signUp
    const { error: err } = await fn(email.trim(), password)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    if (mode === 'sign-up') {
      // If email confirmation is OFF in Supabase, the auth listener flips
      // us into 'signed-in' immediately and AuthGate hides this page.
      // If it's ON, the user has to click the link in their inbox.
      setInfo('Account created. If your project requires email confirmation, check your inbox to finish.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white text-xl font-semibold">
            ₹
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Expense Tracker</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'sign-in'
              ? 'Sign in to view your expenses.'
              : 'Create an account to start tracking.'}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 px-3 py-2 text-sm text-indigo-700 dark:text-indigo-300">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2.5 transition"
          >
            {submitting
              ? 'Working…'
              : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
          </button>

          <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'sign-in' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-up')
                    setError(null)
                    setInfo(null)
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setError(null)
                    setInfo(null)
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
