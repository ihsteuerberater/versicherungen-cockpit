import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CustomerPortalProvider, useCustomerPortal } from './customer/CustomerPortalContext'
import { CustomerHome } from './customer/CustomerHome'
import { CustomerMessages } from './customer/CustomerMessages'
import { CustomerContact } from './customer/CustomerContact'
import { PolicyDetail } from './customer/PolicyDetail'
import type { Customer } from '../lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Home, MessageSquare, Phone } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/nachrichten', label: 'Nachrichten', icon: MessageSquare, end: false },
  { to: '/kontakt', label: 'Kontakt', icon: Phone, end: false },
]

function PortalShell() {
  const { signOut } = useAuth()
  const { org, requests } = useCustomerPortal()
  const location = useLocation()
  const openCount = requests?.filter((r) => !r.archived_at && r.status === 'open').length ?? 0

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          {org?.logo_url && <img src={org.logo_url} alt={org.name} className="h-7 object-contain" />}
          <span className="font-semibold tracking-tight">{org?.name ?? 'Meine Versicherungen'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Abmelden
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<CustomerHome />} />
          <Route path="/policen/:policyId" element={<PolicyDetail />} />
          <Route path="/nachrichten" element={<CustomerMessages />} />
          <Route path="/kontakt" element={<CustomerContact />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className={cn('relative rounded-full px-3.5 py-1 transition-colors', active && 'bg-accent')}>
                <tab.icon className="size-5" />
                {tab.to === '/nachrichten' && openCount > 0 && (
                  <Badge variant="destructive" className="absolute -right-1 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">
                    {openCount}
                  </Badge>
                )}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function CustomerPortal({ customer }: { customer: Customer }) {
  return (
    <CustomerPortalProvider customer={customer}>
      <PortalShell />
    </CustomerPortalProvider>
  )
}
