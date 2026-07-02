import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { uploadBrandingFile } from '../lib/storage'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import type { Insurer, Organization } from '../lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Plus } from 'lucide-react'

export function OrganisationSettings() {
  const { staffProfile } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [insurers, setInsurers] = useState<Insurer[] | null>(null)
  const [newInsurerName, setNewInsurerName] = useState('')

  const load = async () => {
    if (!staffProfile) return
    const { data } = await supabase.from('organizations').select('*').eq('id', staffProfile.organization_id).single()
    setOrg(data)
    if (data) {
      setName(data.name)
      setColor(data.primary_color ?? '#2563eb')
      setPhone(data.phone ?? '')
      setEmail(data.email ?? '')
      setAddress(data.address ?? '')
      setWebsite(data.website ?? '')
    }
    const { data: insurerData } = await supabase.from('insurers').select('*').order('name')
    setInsurers(insurerData ?? [])
  }

  useEffect(() => {
    load()
  }, [staffProfile?.organization_id])

  const handleSave = async () => {
    if (!staffProfile) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name, primary_color: color, phone, email, address, website })
        .eq('id', staffProfile.organization_id)
      if (error) throw error
      document.documentElement.style.setProperty('--primary', color)
      toast.success('Organisation gespeichert.')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !staffProfile) return
    setBusy(true)
    try {
      const path = `org-logos/${staffProfile.organization_id}/logo-${Date.now()}.${file.name.split('.').pop()}`
      const publicUrl = await uploadBrandingFile(path, file)
      const { error } = await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', staffProfile.organization_id)
      if (error) throw error
      toast.success('Logo hochgeladen.')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleAddInsurer = async () => {
    if (!staffProfile || !newInsurerName.trim()) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('insurers')
        .insert({ organization_id: staffProfile.organization_id, name: newInsurerName.trim() })
      if (error) throw error
      setNewInsurerName('')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleInsurerLogoUpload = async (insurer: Insurer, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !staffProfile) return
    setBusy(true)
    try {
      const path = `insurer-logos/${staffProfile.organization_id}/${insurer.id}-${Date.now()}.${file.name.split('.').pop()}`
      const publicUrl = await uploadBrandingFile(path, file)
      const { error } = await supabase.from('insurers').update({ logo_url: publicUrl }).eq('id', insurer.id)
      if (error) throw error
      toast.success('Logo hochgeladen.')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!org) return <div className="p-6 text-muted-foreground">Lädt…</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organisation</h1>
        <p className="text-sm text-muted-foreground">Das sieht dein Kunde von deiner Firma – Logo, Name, Farbe, Kontaktdaten.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Wird im Kunden-Portal angezeigt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-lg">
              <AvatarImage src={org.logo_url ?? undefined} className="object-contain" />
              <AvatarFallback className="rounded-lg">{org.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer text-sm font-medium text-primary">
                Logo hochladen
              </Label>
              <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={busy} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-name">Organisationsname</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-color">Akzentfarbe</Label>
            <div className="flex items-center gap-3">
              <input
                id="org-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input"
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={busy}>
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontaktdaten</CardTitle>
          <CardDescription>Erscheinen im Kunden-Portal unter "Kontakt", damit der Kunde deine Firma direkt erreichen kann.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-phone">Telefon</Label>
            <Input id="org-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+41 41 000 00 00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">E-Mail</Label>
            <Input id="org-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@deinefirma.ch" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-address">Adresse</Label>
            <Input id="org-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Strasse, PLZ Ort" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-website">Internetadresse</Label>
            <Input id="org-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.deinefirma.ch" />
          </div>
          <Button onClick={handleSave} disabled={busy}>
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versicherer</CardTitle>
          <CardDescription>Logos, die dann bei jeder Police mit dieser Gesellschaft automatisch angezeigt werden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {insurers?.map((insurer) => (
            <div key={insurer.id} className="flex items-center gap-4">
              <Avatar className="size-10 rounded-lg">
                <AvatarImage src={insurer.logo_url ?? undefined} className="object-contain" />
                <AvatarFallback className="rounded-lg text-xs">{insurer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{insurer.name}</span>
              <Label htmlFor={`insurer-logo-${insurer.id}`} className="cursor-pointer text-sm text-primary">
                Logo hochladen
              </Label>
              <Input
                id={`insurer-logo-${insurer.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleInsurerLogoUpload(insurer, e)}
                disabled={busy}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Neue Gesellschaft (z.B. AXA)"
              value={newInsurerName}
              onChange={(e) => setNewInsurerName(e.target.value)}
            />
            <Button variant="outline" onClick={handleAddInsurer} disabled={busy || !newInsurerName.trim()}>
              <Plus className="size-4" /> Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
