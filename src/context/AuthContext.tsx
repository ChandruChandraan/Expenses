import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import {
  ensureProfile,
  updateProfile as updateProfileRow,
  type Profile,
  type ProfileUpdate,
} from '../lib/profile'

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session; user: User }

type AuthContextValue = {
  state: AuthState
  profile: Profile | null
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: ProfileUpdate) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const s = data.session
      setState(
        s ? { status: 'signed-in', session: s, user: s.user } : { status: 'signed-out' },
      )
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'signed-in', session, user: session.user }
          : { status: 'signed-out' },
      )
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load profile whenever the user changes.
  const userId = state.status === 'signed-in' ? state.user.id : null
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    void ensureProfile(userId).then((p) => {
      if (!cancelled) setProfile(p)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const p = await ensureProfile(userId)
    setProfile(p)
  }, [userId])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!userId) return { error: 'Not signed in.' }
      const updated = await updateProfileRow(userId, patch)
      if (!updated) return { error: 'Could not update profile.' }
      setProfile(updated)
      return { error: null }
    },
    [userId],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ state, profile, signUp, signIn, signOut, refreshProfile, updateProfile }),
    [state, profile, signUp, signIn, signOut, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
