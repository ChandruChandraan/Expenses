import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Save, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SUPPORTED_CURRENCIES, deriveDisplayName, uploadAvatar } from '../lib/profile'

export function ProfilePage() {
  const { state, profile, updateProfile, refreshProfile } = useAuth()
  const email = state.status === 'signed-in' ? state.user.email ?? '' : ''
  const userId = state.status === 'signed-in' ? state.user.id : null

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Hydrate fields when the profile finishes loading.
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setPhone(profile.phone || '')
    setAvatarUrl(profile.avatar_url || '')
    setCurrency(profile.default_currency || 'INR')
  }, [profile])

  const previewName = displayName.trim() || deriveDisplayName(profile, email)
  const previewInitial = (previewName.charAt(0) || '?').toUpperCase()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const { error: err } = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim(),
      avatar_url: avatarUrl.trim(),
      default_currency: currency,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be under 2 MB.')
      return
    }
    setError(null)
    setUploading(true)
    const { url, error: upErr } = await uploadAvatar(userId, file)
    if (!upErr && url) {
      setAvatarUrl(url)
      // Persist immediately so the header reflects the new picture even
      // before the user clicks Save on the rest of the form.
      const { error: saveErr } = await updateProfile({ avatar_url: url })
      if (saveErr) setError(saveErr)
      else await refreshProfile()
    } else if (upErr) {
      setError(upErr)
    }
    setUploading(false)
  }

  if (!profile) {
    return (
      <div className="card flex items-center justify-center py-10 text-sm text-neutral-500 dark:text-neutral-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading profile…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Your name, contact, photo and default currency.
        </p>
      </div>

      <section className="card space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your avatar"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-800"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-200 text-2xl font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {previewInitial}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Upload avatar"
              className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-neutral-900 p-2 text-white shadow ring-2 ring-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:ring-neutral-950 dark:hover:bg-neutral-200"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleAvatarUpload(f)
                e.target.value = ''
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold tracking-tight">
              {previewName}
            </div>
            <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              {email}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Chandru"
              maxLength={64}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Shown in the header and on the profile card. Falls back to the
              local part of your email if blank.
            </p>
          </Field>

          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98xxxxxxxx"
              type="tel"
              maxLength={32}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </Field>

          <Field label="Avatar URL">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (optional — or use the camera button)"
              maxLength={512}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Click the camera icon to upload an image (≤ 2 MB) — it goes to a
              private bucket and only you can overwrite it.
            </p>
          </Field>

          <Field label="Default currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Used everywhere amounts are shown — Dashboard, Expenses,
              Members, charts.
            </p>
          </Field>

          <Field label="Email" hint="Read-only — change via Supabase auth.">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
              <User className="h-4 w-4" />
              <span className="truncate">{email}</span>
            </div>
          </Field>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Profile saved.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
        {hint && (
          <span className="ml-2 text-neutral-400 dark:text-neutral-500">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}
