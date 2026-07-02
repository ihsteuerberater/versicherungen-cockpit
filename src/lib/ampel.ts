export type Ampel = 'rot' | 'gelb' | 'gruen'

export const ampelBadgeClass: Record<Ampel, string> = {
  rot: 'border-danger/30 bg-danger/10 text-danger',
  gelb: 'border-warning/30 bg-warning/10 text-warning',
  gruen: 'border-success/30 bg-success/10 text-success',
}

const DAY_MS = 24 * 60 * 60 * 1000

export function ampelForPolicy(
  endDate: string | null,
  nextDue: { due_date: string; paid: boolean } | null,
): { ampel: Ampel; reason: string } {
  const now = Date.now()

  if (nextDue && !nextDue.paid && new Date(nextDue.due_date).getTime() < now) {
    return { ampel: 'rot', reason: 'Prämie überfällig' }
  }
  if (endDate) {
    const daysToEnd = (new Date(endDate).getTime() - now) / DAY_MS
    if (daysToEnd < 30) return { ampel: 'rot', reason: 'Läuft in weniger als 30 Tagen ab' }
    if (daysToEnd < 90) return { ampel: 'gelb', reason: 'Läuft in weniger als 90 Tagen ab' }
  }
  if (nextDue && !nextDue.paid) {
    const daysToDue = (new Date(nextDue.due_date).getTime() - now) / DAY_MS
    if (daysToDue < 14) return { ampel: 'gelb', reason: 'Prämie bald fällig' }
  }
  return { ampel: 'gruen', reason: 'Alles in Ordnung' }
}
