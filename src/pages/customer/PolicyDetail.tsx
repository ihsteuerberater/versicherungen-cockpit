import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { extractErrorMessage } from '../../lib/errors'
import { iconForSparte } from '../../lib/sparteIcons'
import { formatDate } from '../../lib/date'
import { paymentFrequencyLabels } from '../../lib/paymentFrequency'
import { policyStatusLabels, policyStatusClass } from '../../lib/policyStatus'
import { sanitizeFileName, ensureFreshSession } from '../../lib/storage'
import { useCustomerPortal } from './CustomerPortalContext'
import { PortalBanner } from '../../components/PortalBanner'
import type { PolicyDocument } from '../../lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Info, FileText, Upload } from 'lucide-react'

export function PolicyDetail() {
  const { policyId } = useParams<{ policyId: string }>()
  const { customer, policies } = useCustomerPortal()
  const [documents, setDocuments] = useState<(PolicyDocument & { url: string | null })[] | null>(null)
  const [uploading, setUploading] = useState(false)

  const policy = policies?.find((p) => p.id === policyId)

  const loadDocuments = async () => {
    if (!policyId) return
    const { data } = await supabase.from('documents').select('*').eq('policy_id', policyId).order('created_at', { ascending: false })
    const withUrls = await Promise.all(
      (data ?? []).map(async (doc) => {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60 * 60)
        return { ...doc, url: signed?.signedUrl ?? null }
      }),
    )
    setDocuments(withUrls)
  }

  useEffect(() => {
    loadDocuments()
  }, [policyId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !policyId) return
    setUploading(true)
    try {
      const path = `${customer.id}/${policyId}/${Date.now()}-${sanitizeFileName(file.name)}`
      await ensureFreshSession()
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError
      const { error: insertError } = await supabase.from('documents').insert({
        organization_id: customer.organization_id,
        customer_id: customer.id,
        policy_id: policyId,
        file_path: path,
        source: 'uploaded',
      })
      if (insertError) throw insertError
      toast.success('Dokument hochgeladen.')
      await loadDocuments()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!policy) return <div className="p-6 text-sm text-muted-foreground">Lädt…</div>

  const SparteIcon = iconForSparte(policy.sparte)
  const sortedPremiums = policy.premiums.slice().sort((a, b) => b.due_date.localeCompare(a.due_date))

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Zurück
      </Link>

      <PortalBanner icon={SparteIcon} title={policy.sparte} subtitle={policy.insurer_name} />

      <Tabs defaultValue="uebersicht">
        <TabsList className="w-full">
          <TabsTrigger value="uebersicht" className="flex-1">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="zahlungen" className="flex-1">
            Zahlungen
          </TabsTrigger>
          <TabsTrigger value="dokumente" className="flex-1">
            Dokumente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="space-y-4">
          <Card>
            <CardContent className="space-y-2 text-sm">
              {policy.insurer_logo_url && (
                <div className="mb-1 flex items-center gap-2">
                  <Avatar className="size-8 rounded">
                    <AvatarImage src={policy.insurer_logo_url} className="object-contain" />
                    <AvatarFallback className="rounded text-xs">{policy.insurer_name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{policy.insurer_name}</span>
                </div>
              )}
              {policy.policy_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Policennummer</span>
                  <span className="font-medium">{policy.policy_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={policyStatusClass[policy.status]}>{policyStatusLabels[policy.status]}</Badge>
              </div>
              {policy.start_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vertragsbeginn</span>
                  <span className="font-medium">{formatDate(policy.start_date)}</span>
                </div>
              )}
              {policy.payment_frequency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zahlungsrhythmus</span>
                  <span className="font-medium">{paymentFrequencyLabels[policy.payment_frequency]}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-accent/40">
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 font-medium">
                <Info className="size-4" /> Das lohnt sich zu wissen
              </p>
              {policy.end_date && (
                <div>
                  <p className="text-sm font-medium">Nächste automatische Verlängerung</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(policy.end_date)} – ein guter Zeitpunkt für einen kurzen Check, ob die Prämie noch
                    marktgerecht ist. Melde dich rechtzeitig vorher bei uns, dann prüfen wir das gemeinsam.
                  </p>
                </div>
              )}
              {policy.cancellation_period && (
                <div>
                  <p className="text-sm font-medium">Kündigungsfrist</p>
                  <p className="text-sm text-muted-foreground">{policy.cancellation_period}</p>
                </div>
              )}
              {policy.cancellation_right_annual && (
                <div>
                  <p className="text-sm font-medium">Jährliches Kündigungsrecht</p>
                  <p className="text-sm text-muted-foreground">
                    Diese Police kann jedes Jahr gekündigt werden. Bevor du etwas veränderst, sprich mit uns – wir
                    schauen gemeinsam, ob sich ein Wechsel lohnt oder ob es bessere Lösungen gibt.
                  </p>
                </div>
              )}
              {!policy.end_date && !policy.cancellation_period && !policy.cancellation_right_annual && (
                <p className="text-sm text-muted-foreground">Dein Berater hat hierzu noch keine Angaben erfasst.</p>
              )}
              {(policy.end_date || policy.cancellation_period || policy.cancellation_right_annual) && (
                <Button asChild size="sm" variant="secondary" className="w-full">
                  <Link to={`/nachrichten?neu=frage`}>Berater zu dieser Police kontaktieren</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zahlungen" className="space-y-2">
          {sortedPremiums.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Prämien erfasst.</p>}
          {sortedPremiums.map((prem) => (
            <div key={prem.id} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm">
              <span>CHF {prem.amount} · fällig {formatDate(prem.due_date)}</span>
              <Badge variant={prem.paid ? 'outline' : 'secondary'}>{prem.paid ? 'bezahlt' : 'offen'}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="dokumente" className="space-y-3">
          <label>
            <Button asChild size="sm" disabled={uploading}>
              <span>
                <Upload className="size-4" /> {uploading ? 'Lädt hoch…' : 'Dokument hochladen'}
              </span>
            </Button>
            <Input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          {documents?.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Dokumente.</p>}
          {documents?.map((doc) => (
            <a
              key={doc.id}
              href={doc.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm hover:bg-accent/40"
            >
              <FileText className="size-4 text-muted-foreground" />
              {doc.file_path.split('/').pop()}
            </a>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
