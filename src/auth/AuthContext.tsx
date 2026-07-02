import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Customer, StaffProfile } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  staffProfile: StaffProfile | null | undefined // undefined = noch am Laden
  customerProfile: Customer | null | undefined // undefined = noch am Laden
  loading: boolean
  refreshProfiles: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null | undefined>(undefined)
  const [customerProfile, setCustomerProfile] = useState<Customer | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  // Ein Account ist entweder Mitarbeiter oder Kunde, nie beides.
  const loadProfiles = async (userId: string) => {
    const { data: staff } = await supabase.from('staff_users').select('*').eq('id', userId).maybeSingle()
    if (staff) {
      setStaffProfile(staff)
      setCustomerProfile(null)
      return
    }
    setStaffProfile(null)
    const { data: customer } = await supabase.from('customers').select('*').eq('customer_user_id', userId).maybeSingle()
    setCustomerProfile(customer ?? null)
  }

  // Holt die Session frisch statt sich auf den React-State zu verlassen: direkt
  // nach signUp() kann der onAuthStateChange-Listener seinen eigenen (verfrühten)
  // loadProfiles-Aufruf noch nicht abgeschlossen haben, wodurch der geschlossene
  // "session"-Wert hier veraltet (noch null) sein kann.
  const refreshProfiles = async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user.id) await loadProfiles(data.session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user.id) await loadProfiles(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user.id) {
        await loadProfiles(newSession.user.id)
      } else {
        setStaffProfile(undefined)
        setCustomerProfile(undefined)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, staffProfile, customerProfile, loading, refreshProfiles, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}
