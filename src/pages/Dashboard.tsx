import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ampelForPolicy, type Ampel } from '../lib/ampel'
import { iconForSparte } from '../lib/sparteIcons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface DashboardRow {
  policyId: string
  customerId: string
  customerName: string
  sparte: string
  insurerName: string
  insurerLogoUrl: string | null
  endDate: string | null
  ampel: Ampel
  reason: string
}

const ampelDot: Record<Ampel, string> = {
  rot: 'bg-danger',
  gelb: 'bg-warning',
  gruen: 'bg-success',
}

const ampelBadge: Record<Ampel, 'destructive' | 'secondary' | 'outline'> = {
  rot: 'destructive',
  gelb: 'secondary',
  gruen: 'outline',
}

export function Dashboard() {
  const [rows, setRows] = useState<DashboardRow[] | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: policies } = await supabase
        .from('policies')
        .select('id, customer_id, sparte, insurer_name, insurer_logo_url, end_date, customers(display_name)')
        .eq('status', 'active')

      if (!policies) {
        setRows([])
        return
      }

      const { data: premiums } = await supabase
        .from('premiums')
        .select('policy_id, due_date, paid')
        .order('due_date', { ascending: true })

      const nextDueByPolicy = new Map<string, { due_date: string; paid: boolean }>()
      for (const p of premiums ?? []) {
        if (!nextDueByPolicy.has(p.policy_id)) nextDueByPolicy.set(p.policy_id, p)
      }

      const result: DashboardRow[] = policies.map((p) => {
        const nextDue = nextDueByPolicy.get(p.id) ?? null
        const { ampel, reason } = ampelForPolicy(p.end_date, nextDue)
        const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers
        return {
          policyId: p.id,
          customerId: p.customer_id,
          customerName: customer?.display_name ?? '—',
          sparte: p.sparte,
          insurerName: p.insurer_name,
          insurerLogoUrl: p.insurer_logo_url,
          endDate: p.end_date,
          ampel,
          reason,
        }
      })

      result.sort((a, b) => (a.ampel === b.ampel ? 0 : a.ampel === 'rot' ? -1 : b.ampel === 'rot' ? 1 : a.ampel === 'gelb' ? -1 : 1))
      setRows(result)
    }
    load()
  }, [])

  const counts = rows?.reduce(
    (acc, r) => ({ ...acc, [r.ampel]: acc[r.ampel] + 1 }),
    { rot: 0, gelb: 0, gruen: 0 } as Record<Ampel, number>,
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Alle aktiven Policen deiner Kunden, nach Dringlichkeit sortiert.</p>
      </div>

      {counts && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-danger" />
              <div>
                <p className="text-2xl font-semibold">{counts.rot}</p>
                <p className="text-xs text-muted-foreground">Handlungsbedarf</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-warning" />
              <div>
                <p className="text-2xl font-semibold">{counts.gelb}</p>
                <p className="text-xs text-muted-foreground">Bald fällig</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <span className="size-3 rounded-full bg-success" />
              <div>
                <p className="text-2xl font-semibold">{counts.gruen}</p>
                <p className="text-xs text-muted-foreground">In Ordnung</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {rows === null && <p className="text-sm text-muted-foreground">Lädt…</p>}
      {rows?.length === 0 && <p className="text-sm text-muted-foreground">Keine Policen erfasst.</p>}

      <div className="space-y-2">
        {rows?.map((r) => {
          const SparteIcon = iconForSparte(r.sparte)
          return (
            <Link
              key={r.policyId}
              to={`/kunden/${r.customerId}`}
              className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm shadow-sm transition-colors hover:bg-accent/40"
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', ampelDot[r.ampel])} />
              {r.insurerLogoUrl ? (
                <Avatar className="size-9 shrink-0 rounded-full bg-muted">
                  <AvatarImage src={r.insurerLogoUrl} className="object-contain p-1" />
                  <AvatarFallback className="text-[10px]">{r.insurerName.slice(0, 2)}</AvatarFallback>
                </Avatar>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <SparteIcon className="size-4 text-muted-foreground" />
                </span>
              )}
              <span className="min-w-[140px] font-medium">{r.customerName}</span>
              <span className="flex-1 text-muted-foreground">
                {r.sparte} · {r.insurerName}
              </span>
              <Badge variant={ampelBadge[r.ampel]}>{r.reason}</Badge>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
