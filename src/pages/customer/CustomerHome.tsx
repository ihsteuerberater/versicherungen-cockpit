import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { ampelForPolicy, ampelBadgeClass } from '../../lib/ampel'
import { extractErrorMessage } from '../../lib/errors'
import { findCoverageGaps, lifeEventOptions, privatCoverageBaseline, SONSTIGES_LIFE_EVENT_VALUE } from '../../lib/crossSelling'
import { iconForSparte } from '../../lib/sparteIcons'
import { formatDate } from '../../lib/date'
import { paymentFrequencyLabels } from '../../lib/paymentFrequency'
import { sanitizeFileName, ensureFreshSession } from '../../lib/storage'
import { useCustomerPortal } from './CustomerPortalContext'
import { PortalBanner } from '../../components/PortalBanner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Umbrella, Sparkles, Lightbulb, TriangleAlert, MessageCircleQuestion, FileUp, ChevronRight } from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function CustomerHome() {
  const { customer, policies } = useCustomerPortal()
  const navigate = useNavigate()
  const [lifeEvents, setLifeEvents] = useState<string[]>([])
  const [customLifeEvent, setCustomLifeEvent] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadNote, setUploadNote] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const coverageGaps = policies ? findCoverageGaps(policies.map((p) => p.sparte), privatCoverageBaseline) : []

  // Deckungslücken einmalig als Chance beim Berater anlegen. Die Eindeutigkeit
  // wird atomar in der Datenbank erzwungen (sync_coverage_gap_opportunity),
  // damit doppelte Ausführung (z.B. React StrictMode) nie zu Duplikaten führt.
  useEffect(() => {
    if (!policies) return
    const syncGaps = async () => {
      const gaps = findCoverageGaps(policies.map((p) => p.sparte), privatCoverageBaseline)
      for (const gap of gaps) {
        await supabase.rpc('sync_coverage_gap_opportunity', {
          p_organization_id: customer.organization_id,
          p_customer_id: customer.id,
          p_note: gap.label,
        })
      }
    }
    syncGaps()
  }, [policies])

  const hasEmptyCustomEvent = lifeEvents.includes(SONSTIGES_LIFE_EVENT_VALUE) && customLifeEvent.trim() === ''

  const handleSubmitLifeEvents = async () => {
    if (lifeEvents.length === 0 || hasEmptyCustomEvent) return
    try {
      const noteFor = (value: string) =>
        value === SONSTIGES_LIFE_EVENT_VALUE ? customLifeEvent.trim() : lifeEventOptions.find((o) => o.value === value)?.label ?? value
      const { error } = await supabase.from('opportunities').insert(
        lifeEvents.map((value) => ({
          organization_id: customer.organization_id,
          customer_id: customer.id,
          kind: 'lebensereignis',
          note: noteFor(value),
        })),
      )
      if (error) throw error
      setLifeEvents([])
      setCustomLifeEvent('')
      toast.success('Danke! Dein Berater meldet sich bei dir.')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleUploadFoundPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !customer.customer_user_id) return
    setUploading(true)
    try {
      const { data: newRequest, error: reqError } = await supabase
        .from('requests')
        .insert({ organization_id: customer.organization_id, customer_id: customer.id, kind: 'neue_police' })
        .select()
        .single()
      if (reqError) throw reqError

      const messageText = uploadNote.trim() || 'Ich habe eine Police gefunden, die noch nicht erfasst ist.'
      const { error: msgError } = await supabase.from('request_messages').insert({
        organization_id: customer.organization_id,
        request_id: newRequest.id,
        sender_role: 'kunde',
        sender_id: customer.customer_user_id,
        message: messageText,
      })
      if (msgError) throw msgError

      const path = `${customer.id}/lose/${Date.now()}-${sanitizeFileName(uploadFile.name)}`
      await ensureFreshSession()
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, uploadFile)
      if (uploadError) throw uploadError

      const { error: docError } = await supabase.from('documents').insert({
        organization_id: customer.organization_id,
        customer_id: customer.id,
        request_id: newRequest.id,
        file_path: path,
        source: 'uploaded',
      })
      if (docError) throw docError

      setUploadDialogOpen(false)
      setUploadNote('')
      setUploadFile(null)
      toast.success('Police hochgeladen. Dein Berater meldet sich bei dir.')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <PortalBanner
        icon={Umbrella}
        title={`${getGreeting()}, ${customer.display_name.split(' ')[0]}`}
        subtitle="Hier ist der Überblick über deine Policen."
      />

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/nachrichten?neu=schaden')}
          className="flex flex-col items-center gap-2 rounded-xl border bg-background px-3 py-4 text-center shadow-sm transition-colors hover:bg-accent/40"
        >
          <TriangleAlert className="size-5 text-primary" />
          <span className="text-xs font-medium">Schaden melden</span>
        </button>
        <button
          onClick={() => navigate('/nachrichten?neu=frage')}
          className="flex flex-col items-center gap-2 rounded-xl border bg-background px-3 py-4 text-center shadow-sm transition-colors hover:bg-accent/40"
        >
          <MessageCircleQuestion className="size-5 text-primary" />
          <span className="text-xs font-medium">Frage stellen</span>
        </button>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex flex-col items-center gap-2 rounded-xl border bg-background px-3 py-4 text-center shadow-sm transition-colors hover:bg-accent/40">
              <FileUp className="size-5 text-primary" />
              <span className="text-xs font-medium">Police hochladen</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleUploadFoundPolicy} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Police hochladen</DialogTitle>
                <DialogDescription>
                  Hast du eine Police gefunden, die hier noch nicht erfasst ist? Lade sie hoch, dein Berater trägt sie
                  dann für dich ein.
                </DialogDescription>
              </DialogHeader>
              <Input type="file" required onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
              <Textarea
                placeholder="Hinweis an deinen Berater (optional) – z.B. bei welcher Gesellschaft, oder falls du unsicher bist, ob er dort schon eingetragen ist."
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
              />
              <DialogFooter>
                <Button type="submit" disabled={uploading || !uploadFile}>
                  {uploading ? 'Lädt hoch…' : 'Hochladen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {policies === null && <p className="text-sm text-muted-foreground">Lädt…</p>}
      {policies?.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Policen erfasst. Dein Berater trägt sie nach und nach ein.</p>}

      <div className="space-y-3">
        {policies?.map((p) => {
          const nextDue = p.premiums.slice().sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null
          const { ampel, reason } = ampelForPolicy(p.end_date, nextDue)
          const SparteIcon = iconForSparte(p.sparte)
          return (
            <Link key={p.id} to={`/policen/${p.id}`}>
              <Card className="transition-colors hover:bg-accent/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {p.insurer_logo_url ? (
                      <Avatar className="size-5 rounded">
                        <AvatarImage src={p.insurer_logo_url} className="object-contain" />
                        <AvatarFallback className="rounded text-[10px]">{p.insurer_name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <SparteIcon className="size-4 text-muted-foreground" />
                    )}
                    {p.sparte} · {p.insurer_name}
                  </CardTitle>
                  <CardDescription>{reason}</CardDescription>
                  <CardAction className="flex items-center gap-1.5">
                    <Badge variant="outline" className={ampelBadgeClass[ampel]}>
                      {ampel === 'rot' ? 'Handlungsbedarf' : ampel === 'gelb' ? 'Bald fällig' : 'In Ordnung'}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                  {p.end_date && <span>Ablauf: {formatDate(p.end_date)}</span>}
                  {p.cancellation_period && <span>Kündigungsfrist: {p.cancellation_period}</span>}
                  {p.cancellation_right_annual && <Badge variant="outline">jährlich kündbar</Badge>}
                  {p.payment_frequency && <span>Zahlung: {paymentFrequencyLabels[p.payment_frequency]}</span>}
                  {nextDue && (
                    <span>
                      Nächste Prämie: CHF {nextDue.amount} · fällig {formatDate(nextDue.due_date)} · {nextDue.paid ? 'bezahlt' : 'offen'}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {coverageGaps.length > 0 && (
        <Card className="border-primary/30 bg-accent/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4" /> Das könnte für dich interessant sein
            </CardTitle>
            <CardDescription>Basierend auf deinen aktuellen Policen fehlt dir eventuell:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coverageGaps.map((g) => (
              <div key={g.label}>
                <p className="font-medium">{g.label}</p>
                <p className="text-sm text-muted-foreground">{g.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" /> Hat sich etwas bei dir verändert?
          </CardTitle>
          <CardDescription>Wähle aus, was zutrifft – dein Berater meldet sich dann bei dir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {lifeEventOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={lifeEvents.includes(opt.value)}
                  onCheckedChange={(checked) =>
                    setLifeEvents((prev) => (checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)))
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
          {lifeEvents.includes(SONSTIGES_LIFE_EVENT_VALUE) && (
            <Input
              placeholder="Was hat sich verändert?"
              value={customLifeEvent}
              onChange={(e) => setCustomLifeEvent(e.target.value)}
            />
          )}
          <Button size="sm" onClick={handleSubmitLifeEvents} disabled={lifeEvents.length === 0 || hasEmptyCustomEvent}>
            Mitteilen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
