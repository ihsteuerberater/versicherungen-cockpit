import type { PolicyStatus } from './types'

export const policyStatusLabels: Record<PolicyStatus, string> = {
  active: 'Aktiv',
  sistiert: 'Sistiert',
  cancelled: 'Gekündigt',
  expired: 'Abgelaufen',
}

export const policyStatusClass: Record<PolicyStatus, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  sistiert: 'border-warning/30 bg-warning/10 text-warning',
  cancelled: 'border-danger/30 bg-danger/10 text-danger',
  expired: 'border-danger/30 bg-danger/10 text-danger',
}
