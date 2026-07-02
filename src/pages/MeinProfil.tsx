import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { uploadBrandingFile } from '../lib/storage'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function MeinProfil() {
  const { staffProfile, refreshProfiles } = useAuth()
  const [phone, setPhone] = useState(staffProfile?.phone ?? '')
  const [busy, setBusy] = useState(false)

  if (!staffProfile) return null

  const handleSave = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.rpc('update_own_staff_profile', {
        new_phone: phone || null,
        new_photo_url: staffProfile.photo_url,
      })
      if (error) throw error
      toast.success('Profil gespeichert.')
      await refreshProfiles()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const path = `staff-photos/${staffProfile.id}/photo-${Date.now()}.${file.name.split('.').pop()}`
      const publicUrl = await uploadBrandingFile(path, file)
      const { error } = await supabase.rpc('update_own_staff_profile', {
        new_phone: phone || null,
        new_photo_url: publicUrl,
      })
      if (error) throw error
      toast.success('Foto hochgeladen.')
      await refreshProfiles()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mein Profil</h1>
        <p className="text-sm text-muted-foreground">Das sehen deine Kunden im Kunden-Portal als "Dein Berater".</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{staffProfile.full_name}</CardTitle>
          <CardDescription>{staffProfile.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={staffProfile.photo_url ?? undefined} />
              <AvatarFallback>{staffProfile.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer text-sm font-medium text-primary">
                Foto hochladen
              </Label>
              <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={busy} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefonnummer</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+41 79 000 00 00" />
          </div>

          <Button onClick={handleSave} disabled={busy}>
            Speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
