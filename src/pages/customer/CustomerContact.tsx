import { useCustomerPortal } from './CustomerPortalContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Phone, Mail, MapPin } from 'lucide-react'

export function CustomerContact() {
  const { org, advisor } = useCustomerPortal()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Kontakt</h1>
        <p className="text-sm text-muted-foreground">So erreichst du deinen Berater und deine Versicherungsfirma.</p>
      </div>

      {advisor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dein Berater</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={advisor.photo_url ?? undefined} />
              <AvatarFallback className="text-lg">{advisor.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{advisor.full_name}</p>
              {advisor.phone && (
                <a href={`tel:${advisor.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-primary">
                  <Phone className="size-4" /> {advisor.phone}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {org && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt={org.name} className="h-8 object-contain" />}
            <CardTitle className="text-base">{org.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {org.address && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" /> {org.address}
              </p>
            )}
            {org.phone && (
              <a href={`tel:${org.phone}`} className="flex items-center gap-2 text-primary">
                <Phone className="size-4 shrink-0" /> {org.phone}
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="flex items-center gap-2 text-primary">
                <Mail className="size-4 shrink-0" /> {org.email}
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
