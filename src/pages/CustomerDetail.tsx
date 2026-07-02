import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { extractErrorMessage } from '../lib/errors'
import { iconForSparte } from '../lib/sparteIcons'
import { formatDate } from '../lib/date'
import { sanitizeFileName, ensureFreshSession } from '../lib/storage'
import type { Customer, Insurer, Policy, PolicyDocument, Premium } from '../lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Link2, CheckCircle2, FileText, Upload } from 'lucide-react'

interface PolicyWithPremiums extends Policy {
  premiums: Premium[]
  documents: (PolicyDocument & { url: string | null })[]
}

const MANUAL_INSURER = '__manual__'

const emptyPolicyForm = {
  sparte: '',
  insurer_id: '',
  insurer_name: '',
  policy_number: '',
  start_date: '',
  end_date: '',
  cancellation_period: '',
  cancellation_right_annual: false,
  cancellation_deadline: '',
  cancellation_alert_enabled: false,
}

export function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>()
  const { staffProfile } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [policies, setPolicies] = useState<PolicyWithPremiums[] | null>(null)
  const [insurers, setInsurers] = useState<Insurer[]>([])
  const [form, setForm] = useState(emptyPolicyForm)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [premiumDrafts, setPremiumDrafts] = useState<Record<string, { amount: string; due_date: string }>>({})
  const [uploadingDocFor, setUploadingDocFor] = useState<string | null>(null)

  const load = async () => {
    if (!customerId) return
    const { data: customerData } = await supabase.from('customers').select('*').eq('id', customerId).single()
    setCustomer(customerData)

    const { data: policyData } = await supabase
      .from('policies')
      .select('*, premiums(*), documents(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    const rawPolicies = (policyData as (Policy & { premiums: Premium[]; documents: PolicyDocument[] })[]) ?? []
    const withUrls = await Promise.all(
      rawPolicies.map(async (p) => ({
        ...p,
        documents: await Promise.all(
          p.documents.map(async (doc) => {
            const { data: signed } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60 * 60)
            return { ...doc, url: signed?.signedUrl ?? null }
          }),
        ),
      })),
    )
    setPolicies(withUrls)

    const { data: insurerData } = await supabase.from('insurers').select('*').order('name')
    setInsurers(insurerData ?? [])
  }

  useEffect(() => {
    load()
  }, [customerId])

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffProfile || !customerId) return
    const selectedInsurer = insurers.find((i) => i.id === form.insurer_id)
    const insurerName = selectedInsurer ? selectedInsurer.name : form.insurer_name
    if (!insurerName) return
    try {
      const { error } = await supabase.from('policies').insert({
        organization_id: staffProfile.organization_id,
        customer_id: customerId,
        sparte: form.sparte,
        insurer_name: insurerName,
        insurer_logo_url: selectedInsurer?.logo_url ?? null,
        policy_number: form.policy_number || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        cancellation_period: form.cancellation_period || null,
        cancellation_right_annual: form.cancellation_right_annual,
        cancellation_deadline: form.cancellation_deadline || null,
        cancellation_alert_enabled: form.cancellation_alert_enabled,
      })
      if (error) throw error
      setForm(emptyPolicyForm)
      setPolicyDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleAddPremium = async (policyId: string) => {
    if (!staffProfile) return
    const draft = premiumDrafts[policyId]
    if (!draft?.amount || !draft?.due_date) return
    try {
      const { error } = await supabase.from('premiums').insert({
        organization_id: staffProfile.organization_id,
        policy_id: policyId,
        amount: Number(draft.amount),
        due_date: draft.due_date,
      })
      if (error) throw error
      setPremiumDrafts((prev) => ({ ...prev, [policyId]: { amount: '', due_date: '' } }))
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const togglePremiumPaid = async (premium: Premium) => {
    await supabase.from('premiums').update({ paid: !premium.paid }).eq('id', premium.id)
    await load()
  }

  const updateCancellationAlert = async (policyId: string, patch: Partial<Pick<Policy, 'cancellation_deadline' | 'cancellation_alert_enabled'>>) => {
    try {
      const { error } = await supabase.from('policies').update(patch).eq('id', policyId)
      if (error) throw error
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleUploadPolicyDocument = async (policyId: string, file: File | undefined) => {
    if (!file || !staffProfile || !customer) return
    setUploadingDocFor(policyId)
    try {
      const path = `${customer.id}/${policyId}/${Date.now()}-${sanitizeFileName(file.name)}`
      await ensureFreshSession()
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError
      const { error: insertError } = await supabase.from('documents').insert({
        organization_id: staffProfile.organization_id,
        customer_id: customer.id,
        policy_id: policyId,
        file_path: path,
        source: 'manual',
      })
      if (insertError) throw insertError
      toast.success('Dokument hochgeladen – der Kunde kann es in der App herunterladen.')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setUploadingDocFor(null)
    }
  }

  const handleCreateInvite = async () => {
    if (!customerId) return
    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('customers').update({ invite_token: token }).eq('id', customerId)
      if (error) throw error
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link kopiert.')
  }

  if (!customer) return <div className="p-6 text-sm text-muted-foreground">Lädt…</div>

  const inviteLink = customer.invite_token ? `${window.location.origin}/einladung?token=${customer.invite_token}` : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{customer.display_name}</h1>
        <Badge variant="outline">{customer.kind}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kunden-Zugang</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.customer_user_id ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> Zugang aktiv – der Kunde kann sich einloggen.
            </p>
          ) : inviteLink ? (
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copyInviteLink(inviteLink)}>
                <Link2 className="size-4" /> Kopieren
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleCreateInvite}>
              Zugang für Kunden einrichten
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Policen</h2>
        <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Police hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddPolicy} className="space-y-3">
              <DialogHeader>
                <DialogTitle>Neue Police</DialogTitle>
              </DialogHeader>
              <Input placeholder="Sparte (z.B. Haftpflicht, KV, 3a)" value={form.sparte} onChange={(e) => setForm({ ...form, sparte: e.target.value })} required />
              <Select
                value={form.insurer_id || MANUAL_INSURER}
                onValueChange={(v) => setForm({ ...form, insurer_id: v === MANUAL_INSURER ? '' : v, insurer_name: '' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Gesellschaft wählen" />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map((insurer) => (
                    <SelectItem key={insurer.id} value={insurer.id}>
                      {insurer.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_INSURER}>Andere / manuell eingeben</SelectItem>
                </SelectContent>
              </Select>
              {!form.insurer_id && (
                <Input
                  placeholder="Gesellschaft manuell eingeben"
                  value={form.insurer_name}
                  onChange={(e) => setForm({ ...form, insurer_name: e.target.value })}
                  required
                />
              )}
              <Input placeholder="Policennummer" value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ablauf</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <Input
                placeholder="Kündigungsfrist (z.B. 3 Monate zum Ablauf)"
                value={form.cancellation_period}
                onChange={(e) => setForm({ ...form, cancellation_period: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.cancellation_right_annual}
                  onCheckedChange={(checked) => setForm({ ...form, cancellation_right_annual: checked === true })}
                />
                Jährliches Kündigungsrecht
              </label>
              <div className="space-y-1.5">
                <Label>Kündigungsfrist-Stichtag (für Erinnerung im Posteingang)</Label>
                <Input
                  type="date"
                  value={form.cancellation_deadline}
                  onChange={(e) => setForm({ ...form, cancellation_deadline: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.cancellation_alert_enabled}
                  onCheckedChange={(checked) => setForm({ ...form, cancellation_alert_enabled: checked === true })}
                />
                60 Tage vor Stichtag als Chance im Posteingang aufleuchten lassen
              </label>
              <DialogFooter>
                <Button type="submit">Hinzufügen</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {policies?.map((p) => {
          const SparteIcon = iconForSparte(p.sparte)
          return (
          <Card key={p.id}>
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
              {p.policy_number && <CardDescription>Nr. {p.policy_number}</CardDescription>}
              <CardAction>
                <Badge variant="outline">{p.status}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                {p.end_date && <span>Ablauf: {formatDate(p.end_date)}</span>}
                {p.cancellation_period && <span>Kündigungsfrist: {p.cancellation_period}</span>}
                {p.cancellation_right_annual && <Badge variant="outline">jährlich kündbar</Badge>}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kündigungsfrist-Stichtag</Label>
                  <Input
                    type="date"
                    className="h-8 w-40"
                    value={p.cancellation_deadline ?? ''}
                    onChange={(e) => updateCancellationAlert(p.id, { cancellation_deadline: e.target.value || null })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={p.cancellation_alert_enabled}
                    onCheckedChange={(checked) => updateCancellationAlert(p.id, { cancellation_alert_enabled: checked === true })}
                  />
                  60 Tage vorher als Chance aufleuchten
                </label>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium">Prämien</p>
                <div className="space-y-1">
                  {p.premiums.map((prem) => (
                    <div key={prem.id} className="flex items-center justify-between text-sm">
                      <span>
                        CHF {prem.amount} · fällig {formatDate(prem.due_date)}
                      </span>
                      <Button size="sm" variant={prem.paid ? 'secondary' : 'outline'} onClick={() => togglePremiumPaid(prem)}>
                        {prem.paid ? '✓ bezahlt' : 'als bezahlt markieren'}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    placeholder="Betrag CHF"
                    className="w-32"
                    value={premiumDrafts[p.id]?.amount ?? ''}
                    onChange={(e) =>
                      setPremiumDrafts((prev) => ({ ...prev, [p.id]: { amount: e.target.value, due_date: prev[p.id]?.due_date ?? '' } }))
                    }
                  />
                  <Input
                    type="date"
                    className="w-40"
                    value={premiumDrafts[p.id]?.due_date ?? ''}
                    onChange={(e) =>
                      setPremiumDrafts((prev) => ({ ...prev, [p.id]: { amount: prev[p.id]?.amount ?? '', due_date: e.target.value } }))
                    }
                  />
                  <Button size="sm" variant="outline" onClick={() => handleAddPremium(p.id)}>
                    Hinzufügen
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium">Dokumente</p>
                <div className="space-y-1">
                  {p.documents.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Dokumente.</p>}
                  {p.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="size-4" /> {doc.file_path.split('/').pop()}
                    </a>
                  ))}
                </div>
                <label className="mt-2 inline-block">
                  <Button asChild size="sm" variant="outline" disabled={uploadingDocFor === p.id}>
                    <span>
                      <Upload className="size-4" /> {uploadingDocFor === p.id ? 'Lädt hoch…' : 'Police hochladen (für Kunde sichtbar)'}
                    </span>
                  </Button>
                  <Input
                    type="file"
                    className="hidden"
                    disabled={uploadingDocFor === p.id}
                    onChange={(e) => {
                      handleUploadPolicyDocument(p.id, e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>
    </div>
  )
}
