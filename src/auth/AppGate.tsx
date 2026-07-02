import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Login } from '../pages/Login'
import { SetupOrganization } from '../pages/SetupOrganization'
import { MfaEnroll } from '../pages/MfaEnroll'
import { MfaChallenge } from '../pages/MfaChallenge'
import { CustomerPortal } from '../pages/CustomerPortal'

type MfaState =
  | { status: 'loading' }
  | { status: 'needs-enroll' }
  | { status: 'needs-challenge'; factorId: string }
  | { status: 'satisfied' }

export function AppGate({ children }: { children: ReactNode }) {
  const { session, staffProfile, customerProfile, loading } = useAuth()
  const [mfaState, setMfaState] = useState<MfaState>({ status: 'loading' })

  // 2FA ist nur für Mitarbeitende Pflicht, nicht für Kunden.
  useEffect(() => {
    if (!session || !staffProfile) return

    let cancelled = false
    const checkMfa = async () => {
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (cancelled) return
      if (level?.currentLevel === 'aal2') {
        setMfaState({ status: 'satisfied' })
        return
      }
      const { data: factors } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      const verifiedTotp = factors?.totp.find((f) => f.status === 'verified')
      if (verifiedTotp) {
        setMfaState({ status: 'needs-challenge', factorId: verifiedTotp.id })
      } else {
        setMfaState({ status: 'needs-enroll' })
      }
    }
    checkMfa()
    return () => {
      cancelled = true
    }
  }, [session, staffProfile])

  if (loading) return <div className="center-screen">Lädt…</div>
  if (!session) return <Login />
  if (staffProfile === undefined || customerProfile === undefined) return <div className="center-screen">Lädt…</div>

  if (customerProfile) return <CustomerPortal customer={customerProfile} />

  if (staffProfile === null) return <SetupOrganization />

  if (mfaState.status === 'loading') return <div className="center-screen">Lädt…</div>
  if (mfaState.status === 'needs-enroll') return <MfaEnroll />
  if (mfaState.status === 'needs-challenge') return <MfaChallenge factorId={mfaState.factorId} />

  return <>{children}</>
}
