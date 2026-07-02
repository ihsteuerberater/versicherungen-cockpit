export type StaffRole = 'owner' | 'mitarbeiter'
export type StaffAccessLevel = 'assigned_only' | 'full'

export interface StaffProfile {
  id: string
  organization_id: string
  full_name: string
  email: string
  role: StaffRole
  access_level: StaffAccessLevel
  phone: string | null
  photo_url: string | null
}

export interface Organization {
  id: string
  name: string
  subdomain: string | null
  logo_url: string | null
  primary_color: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export type CustomerKind = 'person' | 'haushalt' | 'firma'

export interface Customer {
  id: string
  organization_id: string
  kind: CustomerKind
  display_name: string
  assigned_staff_id: string | null
  customer_user_id: string | null
  invite_token: string | null
  created_at: string
}

export interface Insurer {
  id: string
  organization_id: string
  name: string
  logo_url: string | null
  created_at: string
}

export type PolicyStatus = 'active' | 'cancelled' | 'expired'

export interface Policy {
  id: string
  organization_id: string
  customer_id: string
  sparte: string
  insurer_name: string
  insurer_logo_url: string | null
  policy_number: string | null
  start_date: string | null
  end_date: string | null
  cancellation_period: string | null
  cancellation_right_annual: boolean
  cancellation_deadline: string | null
  cancellation_alert_enabled: boolean
  status: PolicyStatus
  created_at: string
}

export interface Premium {
  id: string
  organization_id: string
  policy_id: string
  amount: number
  due_date: string
  paid: boolean
  effective_from: string
}

export type RequestKind = 'schaden' | 'frage' | 'lebensereignis' | 'dokument' | 'neue_police'
export type RequestStatus = 'open' | 'answered'

export interface CustomerRequest {
  id: string
  organization_id: string
  customer_id: string
  kind: RequestKind
  message: string | null
  reply: string | null
  status: RequestStatus
  archived_at: string | null
  created_at: string
}

export type MessageSenderRole = 'kunde' | 'berater'

export interface RequestMessage {
  id: string
  organization_id: string
  request_id: string
  sender_role: MessageSenderRole
  sender_id: string
  message: string
  created_at: string
}

export type DocumentSource = 'manual' | 'uploaded' | 'ai_extracted'

export interface PolicyDocument {
  id: string
  organization_id: string
  customer_id: string | null
  policy_id: string | null
  claim_id: string | null
  request_id: string | null
  file_path: string
  source: DocumentSource
  created_at: string
}

export type OpportunityStatus = 'open' | 'contacted' | 'closed'

export interface Opportunity {
  id: string
  organization_id: string
  customer_id: string
  policy_id: string | null
  kind: string
  note: string | null
  status: OpportunityStatus
  created_at: string
}
