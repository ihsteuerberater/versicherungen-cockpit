import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function ClaimInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { refreshProfiles } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Ungültiger Link</CardTitle>
            <CardDescription>Dieser Einladungslink ist unvollständig. Bitte wende dich an deinen Berater.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/einladung-bestaetigt?token=${encodeURIComponent(token)}`,
        },
      })
      if (signUpError) throw signUpError

      if (signUpData.session) {
        const { error: claimError } = await supabase.rpc('claim_customer_invite', { token })
        if (claimError) throw claimError
        await refreshProfiles()
        navigate('/')
        return
      }
      setDone(true)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Konto erstellt</CardTitle>
            <CardDescription>
              Prüfe dein E-Mail-Postfach und bestätige die Adresse. Danach kannst du dich normal einloggen – deine
              Policen werden dann automatisch angezeigt.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Zugang einrichten</CardTitle>
          <CardDescription>Lege ein Passwort fest, um deine Policen-Übersicht zu sehen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-Mail</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-password">Passwort</Label>
              <Input id="invite-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              Zugang aktivieren
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
