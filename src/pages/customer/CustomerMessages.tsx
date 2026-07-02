import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { extractErrorMessage } from '../../lib/errors'
import { MessageThread } from '../../components/MessageThread'
import { RequestAttachments } from '../../components/RequestAttachments'
import { downloadThreadAsText } from '../../lib/exportThread'
import { sanitizeFileName, ensureFreshSession } from '../../lib/storage'
import { useCustomerPortal } from './CustomerPortalContext'
import type { CustomerRequest, RequestKind, RequestMessage } from '../../lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Download, Plus } from 'lucide-react'

const requestKindLabels: Record<RequestKind, string> = {
  schaden: 'Schaden melden',
  frage: 'Frage zur Police',
  lebensereignis: 'Lebensereignis mitteilen',
  dokument: 'Dokument nachreichen',
  neue_police: 'Neue Police eingereicht',
}

// "neue_police" wird nur automatisch über "Police hochladen" auf der Home-Seite
// vergeben, damit Berater das im Posteingang von normalen Anfragen unterscheiden
// können – der Kunde wählt es hier nicht selbst aus.
const selectableRequestKinds = Object.entries(requestKindLabels).filter(([value]) => value !== 'neue_police') as [
  RequestKind,
  string,
][]

export function CustomerMessages() {
  const { customer, requests, refresh } = useCustomerPortal()
  const [searchParams, setSearchParams] = useSearchParams()
  const [kind, setKind] = useState<RequestKind>('frage')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [threadTarget, setThreadTarget] = useState<CustomerRequest | null>(null)

  // Schnellzugriff von der Home-Seite: ?neu=schaden öffnet den Dialog direkt
  // mit vorausgewählter Art, statt dass der Kunde sie erst manuell suchen muss.
  useEffect(() => {
    const requested = searchParams.get('neu')
    if (requested && requested in requestKindLabels) {
      setKind(requested as RequestKind)
      setNewDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: newRequest, error } = await supabase
        .from('requests')
        .insert({ organization_id: customer.organization_id, customer_id: customer.id, kind })
        .select()
        .single()
      if (error) throw error
      const { error: msgError } = await supabase.from('request_messages').insert({
        organization_id: customer.organization_id,
        request_id: newRequest.id,
        sender_role: 'kunde',
        sender_id: customer.customer_user_id,
        message,
      })
      if (msgError) throw msgError

      if (attachment) {
        const path = `${customer.id}/anfragen/${Date.now()}-${sanitizeFileName(attachment.name)}`
        await ensureFreshSession()
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, attachment)
        if (uploadError) throw uploadError
        const { error: docError } = await supabase.from('documents').insert({
          organization_id: customer.organization_id,
          customer_id: customer.id,
          request_id: newRequest.id,
          file_path: path,
          source: 'uploaded',
        })
        if (docError) throw docError
      }

      setMessage('')
      setAttachment(null)
      setNewDialogOpen(false)
      toast.success('Anfrage gesendet.')
      await refresh()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleArchive = async (request: CustomerRequest) => {
    try {
      const { error } = await supabase.rpc('archive_own_request', { p_request_id: request.id })
      if (error) throw error
      setThreadTarget(null)
      toast.success('Für dich als erledigt markiert.')
      await refresh()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleDownload = async (request: CustomerRequest) => {
    const { data } = await supabase.from('request_messages').select('*').eq('request_id', request.id).order('created_at')
    downloadThreadAsText(
      `${requestKindLabels[request.kind]} – ${new Date(request.created_at).toLocaleDateString('de-CH')}`,
      (data as RequestMessage[]) ?? [],
    )
  }

  const activeRequests = requests?.filter((r) => !r.archived_at) ?? []
  const archivedRequests = requests?.filter((r) => r.archived_at) ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nachrichten</h1>
          <p className="text-sm text-muted-foreground">Deine Anfragen an deinen Berater.</p>
        </div>
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Neu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Anfrage an deinen Berater</DialogTitle>
                <DialogDescription>Er meldet sich so schnell wie möglich bei dir.</DialogDescription>
              </DialogHeader>
              <Select value={kind} onValueChange={(v) => setKind(v as RequestKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectableRequestKinds.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Kurze Nachricht" value={message} onChange={(e) => setMessage(e.target.value)} required />
              <Input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              <DialogFooter>
                <Button type="submit">Absenden</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {activeRequests.length === 0 && <p className="text-sm text-muted-foreground">Keine offenen Nachrichten.</p>}
        {activeRequests.map((r) => (
          <button
            key={r.id}
            onClick={() => setThreadTarget(r)}
            className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm shadow-sm transition-colors hover:bg-accent/40"
          >
            <span>{requestKindLabels[r.kind]}</span>
            <Badge variant={r.status === 'open' ? 'secondary' : 'outline'}>{r.status === 'open' ? 'offen' : 'beantwortet'}</Badge>
          </button>
        ))}
      </div>

      {archivedRequests.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Archiv</h3>
          <div className="space-y-2">
            {archivedRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                <span>
                  {requestKindLabels[r.kind]} · {new Date(r.created_at).toLocaleDateString('de-CH')}
                </span>
                <Button size="sm" variant="ghost" onClick={() => handleDownload(r)}>
                  <Download className="size-4" /> Herunterladen
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={threadTarget !== null} onOpenChange={(open) => !open && setThreadTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{threadTarget ? requestKindLabels[threadTarget.kind] : ''}</DialogTitle>
          </DialogHeader>
          {threadTarget && customer.customer_user_id && (
            <>
              <RequestAttachments requestId={threadTarget.id} />
              <MessageThread
                requestId={threadTarget.id}
                organizationId={customer.organization_id}
                senderRole="kunde"
                senderId={customer.customer_user_id}
              />
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => handleArchive(threadTarget)}>
                  Für mich als erledigt markieren
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
