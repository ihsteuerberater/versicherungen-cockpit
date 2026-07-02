import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import type { Customer, CustomerKind } from '../lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, User, Home, Building } from 'lucide-react'

const kindIcon: Record<CustomerKind, typeof User> = {
  person: User,
  haushalt: Home,
  firma: Building,
}

export function Customers() {
  const { staffProfile } = useAuth()
  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [kind, setKind] = useState<CustomerKind>('person')
  const [open, setOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('customers').select('*').order('display_name')
    setCustomers(data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffProfile) return
    try {
      const { error } = await supabase.from('customers').insert({
        display_name: displayName,
        kind,
        organization_id: staffProfile.organization_id,
        assigned_staff_id: staffProfile.id,
      })
      if (error) throw error
      setDisplayName('')
      setOpen(false)
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kunden</h1>
          <p className="text-sm text-muted-foreground">Personen, Haushalte und Firmen in deinem Bestand.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Kunde anlegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Neuer Kunde</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Name (Person, Haushalt oder Firma)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Select value={kind} onValueChange={(v) => setKind(v as CustomerKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="haushalt">Haushalt</SelectItem>
                  <SelectItem value="firma">Firma</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button type="submit">Anlegen</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers === null && <p className="text-sm text-muted-foreground">Lädt…</p>}

      <div className="grid grid-cols-2 gap-3">
        {customers?.map((c) => {
          const Icon = kindIcon[c.kind]
          return (
            <Link key={c.id} to={`/kunden/${c.id}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{c.display_name}</p>
                    <Badge variant="outline" className="mt-0.5">
                      {c.kind}
                    </Badge>
                  </div>
                  {c.customer_user_id && (
                    <Badge variant="secondary" className="text-xs">
                      Zugang aktiv
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
