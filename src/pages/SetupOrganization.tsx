import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function SetupOrganization() {
  const { refreshProfiles, signOut } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error } = await supabase.rpc('bootstrap_organization', {
        org_name: orgName,
        owner_full_name: fullName,
      })
      if (error) throw error
      await refreshProfiles()
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
          <CardTitle className="text-xl">Organisation einrichten</CardTitle>
          <CardDescription>Dieses Konto gehört noch zu keiner Organisation. Lege deine an.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organisationsname</Label>
              <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="z.B. dein Firmenname" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Dein Name</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              Organisation erstellen
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
