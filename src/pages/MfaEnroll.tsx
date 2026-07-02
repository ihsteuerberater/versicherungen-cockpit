import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function MfaEnroll() {
  const { signOut } = useAuth()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error) {
        setError(error.message)
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    })
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError(null)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (verifyError) throw verifyError
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
          <CardTitle className="text-xl">Zwei-Faktor-Login einrichten</CardTitle>
          <CardDescription>
            Pflicht für Mitarbeitende. Scanne den Code mit einer Authenticator-App (z.B. Google Authenticator, 1Password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {qrCode && <img src={qrCode} alt="QR-Code für Authenticator-App" className="mx-auto size-48 rounded-lg border p-2" />}
            {secret && (
              <p className="text-center text-xs text-muted-foreground">
                Kein Scanner zur Hand? Manuell eintragen: <code className="rounded bg-muted px-1 py-0.5">{secret}</code>
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">Code aus der App</Label>
              <Input id="mfa-code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} placeholder="123456" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy || !factorId}>
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
