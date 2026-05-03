import { supabase } from './supabaseClient'

export type Profile = {
  id: string
  display_name: string
  phone: string
  avatar_url: string
  default_currency: string
  created_at: string
  updated_at: string
}

export type ProfileUpdate = {
  display_name?: string
  phone?: string
  avatar_url?: string
  default_currency?: string
}

export const SUPPORTED_CURRENCIES: { code: string; label: string }[] = [
  { code: 'INR', label: '₹ INR (Indian Rupee)' },
  { code: 'USD', label: '$ USD (US Dollar)' },
  { code: 'EUR', label: '€ EUR (Euro)' },
  { code: 'GBP', label: '£ GBP (British Pound)' },
  { code: 'AUD', label: 'A$ AUD (Australian Dollar)' },
  { code: 'CAD', label: 'C$ CAD (Canadian Dollar)' },
  { code: 'SGD', label: 'S$ SGD (Singapore Dollar)' },
  { code: 'AED', label: 'د.إ AED (UAE Dirham)' },
  { code: 'JPY', label: '¥ JPY (Japanese Yen)' },
]

export function deriveDisplayName(p: Profile | null, email: string | null): string {
  const name = p?.display_name?.trim()
  if (name) return name
  if (email) {
    const local = email.split('@')[0] ?? ''
    if (local) return local
  }
  return 'You'
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, phone, avatar_url, default_currency, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return (data as Profile | null) ?? null
}

export async function ensureProfile(userId: string): Promise<Profile | null> {
  const existing = await fetchProfile(userId)
  if (existing) return existing
  // The signup trigger normally inserts this row, but if a user existed
  // before the trigger we self-heal here.
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId })
    .select('id, display_name, phone, avatar_url, default_currency, created_at, updated_at')
    .single()
  if (error) return null
  return data as Profile
}

export async function updateProfile(
  userId: string,
  patch: ProfileUpdate,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('id, display_name, phone, avatar_url, default_currency, created_at, updated_at')
    .single()
  if (error) return null
  return data as Profile
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase()
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (upErr) return { url: null, error: upErr.message }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
