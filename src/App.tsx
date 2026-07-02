import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppGate } from './auth/AppGate'
import { supabase } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { CustomerDetail } from './pages/CustomerDetail'
import { Posteingang } from './pages/Posteingang'
import { OrganisationSettings } from './pages/Organisation'
import { MeinProfil } from './pages/MeinProfil'
import { ClaimInvite } from './pages/ClaimInvite'
import { ClaimInviteConfirm } from './pages/ClaimInviteConfirm'
import { LayoutDashboard, Users, Inbox, Building2, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInboxCount } from './hooks/useInboxCount'
import { Badge } from '@/components/ui/badge'
import './App.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kunden', label: 'Kunden', icon: Users, end: false },
  { to: '/posteingang', label: 'Posteingang', icon: Inbox, end: false },
  { to: '/organisation', label: 'Organisation', icon: Building2, end: false },
  { to: '/mein-profil', label: 'Mein Profil', icon: UserCircle, end: false },
]

function useOrgTheme() {
  const { staffProfile } = useAuth()
  useEffect(() => {
    if (!staffProfile) return
    supabase
      .from('organizations')
      .select('primary_color')
      .eq('id', staffProfile.organization_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.primary_color) {
          document.documentElement.style.setProperty('--primary', data.primary_color)
        }
      })
  }, [staffProfile?.organization_id])
}

function StaffLayout() {
  const { staffProfile, signOut } = useAuth()
  const location = useLocation()
  useOrgTheme()
  const inboxCount = useInboxCount()

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="flex items-center gap-6 border-b bg-background px-6 py-3">
        <span className="font-semibold tracking-tight">Versicherungs-Cockpit</span>
        <nav className="flex flex-1 items-center gap-1">
          {navItems.map((item) => {
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.to === '/posteingang' && inboxCount > 0 && <Badge variant="destructive">{inboxCount}</Badge>}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{staffProfile?.full_name}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Abmelden
          </Button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/kunden" element={<Customers />} />
          <Route path="/kunden/:customerId" element={<CustomerDetail />} />
          <Route path="/posteingang" element={<Posteingang />} />
          <Route path="/organisation" element={<OrganisationSettings />} />
          <Route path="/mein-profil" element={<MeinProfil />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>
          {/* Öffentlich erreichbar, auch ohne bestehende Session */}
          <Route path="/einladung" element={<ClaimInvite />} />
          <Route path="/einladung-bestaetigt" element={<ClaimInviteConfirm />} />
          {/* Alles andere läuft durch den Auth-/2FA-/Rollen-Check */}
          <Route
            path="*"
            element={
              <AppGate>
                <StaffLayout />
              </AppGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
