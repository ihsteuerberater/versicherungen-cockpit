import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import type { Customer, CustomerRequest, Organization, Policy, Premium, StaffProfile } from '../../lib/types'

export interface PolicyWithPremiums extends Policy {
  premiums: Premium[]
}

interface CustomerPortalContextValue {
  customer: Customer
  org: Organization | null
  advisor: StaffProfile | null
  policies: PolicyWithPremiums[] | null
  requests: CustomerRequest[] | null
  refresh: () => Promise<void>
}

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null)

export function CustomerPortalProvider({ customer, children }: { customer: Customer; children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null)
  const [advisor, setAdvisor] = useState<StaffProfile | null>(null)
  const [policies, setPolicies] = useState<PolicyWithPremiums[] | null>(null)
  const [requests, setRequests] = useState<CustomerRequest[] | null>(null)

  const refresh = async () => {
    const { data: orgData } = await supabase.from('organizations').select('*').eq('id', customer.organization_id).maybeSingle()
    setOrg(orgData)

    if (customer.assigned_staff_id) {
      const { data: advisorData } = await supabase.from('staff_users').select('*').eq('id', customer.assigned_staff_id).maybeSingle()
      setAdvisor(advisorData)
    }

    const { data: policyData } = await supabase
      .from('policies')
      .select('*, premiums(*)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setPolicies((policyData as PolicyWithPremiums[]) ?? [])

    const { data: requestData } = await supabase
      .from('requests')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setRequests(requestData ?? [])
  }

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel(`customer-requests-${customer.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `customer_id=eq.${customer.id}` }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [customer.id])

  return (
    <CustomerPortalContext.Provider value={{ customer, org, advisor, policies, requests, refresh }}>
      {children}
    </CustomerPortalContext.Provider>
  )
}

export function useCustomerPortal() {
  const ctx = useContext(CustomerPortalContext)
  if (!ctx) throw new Error('useCustomerPortal muss innerhalb von CustomerPortalProvider verwendet werden')
  return ctx
}
