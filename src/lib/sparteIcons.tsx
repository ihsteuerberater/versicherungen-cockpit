import { Umbrella, Home, Scale, HeartPulse, Car, PiggyBank, HeartHandshake, ShieldCheck, type LucideIcon } from 'lucide-react'

const sparteIconRules: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['haftpflicht'], icon: Umbrella },
  { keywords: ['hausrat'], icon: Home },
  { keywords: ['rechtsschutz'], icon: Scale },
  { keywords: ['kranken', 'kv', 'gesundheit'], icon: HeartPulse },
  { keywords: ['mfz', 'fahrzeug', 'auto', 'motorfahrzeug'], icon: Car },
  { keywords: ['3a', '3b', 'säule', 'saeule', 'vorsorge', 'pk'], icon: PiggyBank },
  { keywords: ['todesfall', 'risikoleben', 'lebensversicherung'], icon: HeartHandshake },
]

export function iconForSparte(sparte: string): LucideIcon {
  const lower = sparte.toLowerCase()
  return sparteIconRules.find((rule) => rule.keywords.some((k) => lower.includes(k)))?.icon ?? ShieldCheck
}
