import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { MessageThread } from '../components/MessageThread'
import { RequestAttachments } from '../components/RequestAttachments'
import type { CustomerRequest, Opportunity, RequestKind } from '../lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MessageSquare, TrendingUp, Archive } from 'lucide-react'

interface RequestRow extends CustomerRequest {
  customers: { display_name: string } | { display_name: string }[] | null
}
interface OpportunityRow extends Opportunity {
  customers: { display_name: string } | { display_name: string }[] | null
}

const requestKindLabels: Record<RequestKind, string> = {
  schaden: 'Schaden melden',
  frage: 'Frage zur Police',
  lebensereignis: 'Lebensereignis mitgeteilt',
  dokument: 'Dokument nachreichen',
  neue_police: 'Neue Police eingereicht',
}

function customerName(c: RequestRow['customers']) {
  const one = Array.isArray(c) ? c[0] : c
  return one?.display_name ?? '—'
}

export function Posteingang() {
  const { staffProfile } = useAuth()
  const [requests, setRequests] = useState<RequestRow[] | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRow[] | null>(null)
  const [threadTarget, setThreadTarget] = useState<RequestRow | null>(null)

  const load = async () => {
    // Nie filtern/löschen – auch archivierte Anfragen bleiben für dich sichtbar.
    const { data: reqData } = await supabase
      .from('requests')
      .select('*, customers(display_name)')
      .order('created_at', { ascending: false })
    setRequests((reqData as RequestRow[]) ?? [])

    // Legt Chancen für bald ablaufende Kündigungsfristen an (Policen mit
    // aktivierter Erinnerung, Stichtag innert 60 Tagen). Dedupliziert atomar
    // in der Datenbank, ein wiederholter Aufruf erzeugt nie Duplikate.
    await supabase.rpc('sync_cancellation_opportunities')

    const { data: oppData } = await supabase
      .from('opportunities')
      .select('*, customers(display_name)')
      .order('created_at', { ascending: false })
    setOpportunities((oppData as OpportunityRow[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const archiveRequest = async (id: string) => {
    try {
      const { error } = await supabase.from('requests').update({ archived_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('Für den Kunden archiviert – bleibt bei dir weiterhin sichtbar.')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const setOpportunityStatus = async (id: string, status: Opportunity['status']) => {
    try {
      const { error } = await supabase.from('opportunities').update({ status }).eq('id', id)
      if (error) throw error
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const openRequests = requests?.filter((r) => r.status === 'open').length ?? 0
  const openOpportunities = opportunities?.filter((o) => o.status === 'open').length ?? 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Posteingang</h1>
        <p className="text-sm text-muted-foreground">Anfragen und Verkaufschancen deiner Kunden, an einem Ort.</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            <MessageSquare className="size-4" /> Anfragen
            {openRequests > 0 && <Badge variant="destructive">{openRequests}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            <TrendingUp className="size-4" /> Chancen
            {openOpportunities > 0 && <Badge>{openOpportunities}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3">
          {requests?.length === 0 && <p className="text-sm text-muted-foreground">Keine Anfragen.</p>}
          {requests?.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/kunden/${r.customer_id}`} className="font-medium hover:underline">
                      {customerName(r.customers)}
                    </Link>
                    <Badge variant="outline">{requestKindLabels[r.kind]}</Badge>
                    {r.status === 'answered' && <Badge variant="secondary">beantwortet</Badge>}
                    {r.archived_at && (
                      <Badge variant="outline">
                        <Archive className="size-3" /> archiviert
                      </Badge>
                    )}
                  </div>
                  {r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!r.archived_at && (
                    <Button size="sm" variant="outline" onClick={() => archiveRequest(r.id)}>
                      Archivieren
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setThreadTarget(r)}>
                    Öffnen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-3">
          {opportunities?.length === 0 && <p className="text-sm text-muted-foreground">Keine Chancen.</p>}
          {opportunities?.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/kunden/${o.customer_id}`} className="font-medium hover:underline">
                      {customerName(o.customers)}
                    </Link>
                    <Badge variant="outline">
                      {o.kind === 'deckungsluecke' ? 'Deckungslücke' : o.kind === 'kuendigungsfrist' ? 'Kündigungsfrist' : 'Lebensereignis'}
                    </Badge>
                  </div>
                  {o.note && <p className="mt-1 text-sm text-muted-foreground">{o.note}</p>}
                </div>
                {o.status === 'open' && (
                  <Button size="sm" variant="secondary" onClick={() => setOpportunityStatus(o.id, 'contacted')}>
                    Kontaktiert
                  </Button>
                )}
                {o.status === 'contacted' && (
                  <Button size="sm" variant="secondary" onClick={() => setOpportunityStatus(o.id, 'closed')}>
                    Erledigt
                  </Button>
                )}
                {o.status === 'closed' && <Badge variant="secondary">erledigt</Badge>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={threadTarget !== null} onOpenChange={(open) => !open && setThreadTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{threadTarget ? customerName(threadTarget.customers) : ''}</DialogTitle>
            <DialogDescription>{threadTarget ? requestKindLabels[threadTarget.kind] : ''}</DialogDescription>
          </DialogHeader>
          {threadTarget && staffProfile && (
            <>
              <RequestAttachments requestId={threadTarget.id} />
              <MessageThread
                requestId={threadTarget.id}
                organizationId={staffProfile.organization_id}
                senderRole="berater"
                senderId={staffProfile.id}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
