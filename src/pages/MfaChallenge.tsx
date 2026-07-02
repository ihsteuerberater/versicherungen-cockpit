import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function MfaChallenge({ factorId }: { factorId: string }) {
  const { signOut } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (error) throw error
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Zwei-Faktor-Code</CardTitle>
          <CardDescription>Gib den aktuellen Code aus deiner Authenticator-App ein.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mfa-challenge-code">Code</Label>
              <Input id="mfa-challenge-code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} placeholder="123456" autoFocus />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              Bestätigen
            </Button>
            <button type="button" className="w-full text-center text-sm text-primary hover:underline" onClick={signOut}>
              Abmelden
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
