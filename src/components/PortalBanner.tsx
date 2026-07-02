import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortalBannerProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  className?: string
}

export function PortalBanner({ icon: Icon, title, subtitle, className }: PortalBannerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 px-5 py-6 text-primary-foreground',
        className,
      )}
    >
      <Icon className="absolute -right-4 -top-4 size-28 opacity-15" strokeWidth={1.2} />
      <p className="relative text-lg font-semibold tracking-tight">{title}</p>
      {subtitle && <p className="relative mt-1 text-sm opacity-90">{subtitle}</p>}
    </div>
  )
}
