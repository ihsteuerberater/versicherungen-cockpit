import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function ClaimInviteConfirm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { refreshProfiles } = useAuth()
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error')
        setError('Kein Einladungs-Token in der URL gefunden.')
        return
      }
      let session = (await supabase.auth.getSession()).data.session
      for (let i = 0; i < 10 && !session; i++) {
        await new Promise((r) => setTimeout(r, 300))
        session = (await supabase.auth.getSession()).data.session
      }
      if (!session) {
        setStatus('error')
        setError('Anmeldung konnte nicht bestätigt werden. Bitte logg dich normal ein.')
        return
      }
      const { error: claimError } = await supabase.rpc('claim_customer_invite', { token })
      if (claimError) {
        setStatus('error')
        setError(extractErrorMessage(claimError))
        return
      }
      await refreshProfiles()
      setStatus('done')
    }
    run()
  }, [token])

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Zugang bestätigen</CardTitle>
          {status === 'working' && <CardDescription>Einen Moment…</CardDescription>}
          {status === 'done' && (
            <CardDescription className="text-success">
              Zugang aktiviert. <Link to="/" className="text-primary hover:underline">Weiter zur Übersicht</Link>
            </CardDescription>
          )}
          {status === 'error' && <CardDescription className="text-destructive">{error}</CardDescription>}
        </CardHeader>
      </Card>
    </div>
  )
}
