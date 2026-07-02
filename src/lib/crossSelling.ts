// ENTWURF – vom Berater fachlich zu prüfen/anzupassen, bevor produktiv genutzt.
// Rein informativer Abgleich gegen vorhandene policies.sparte (Freitext-Stichwörter),
// keine Rechtsberatung, keine automatische Kündigungsempfehlung.
export interface CoverageBaselineItem {
  keywords: string[]
  label: string
  explanation: string
}

export const privatCoverageBaseline: CoverageBaselineItem[] = [
  {
    keywords: ['haftpflicht'],
    label: 'Privathaftpflicht',
    explanation:
      'Deckt Schäden, die du versehentlich anderen zufügst – ohne sie haftest du unbegrenzt mit deinem eigenen Vermögen.',
  },
  {
    keywords: ['hausrat'],
    label: 'Hausratversicherung',
    explanation: 'Schützt dein Eigentum zuhause bei Diebstahl, Feuer oder Wasserschaden.',
  },
  {
    keywords: ['rechtsschutz'],
    label: 'Rechtsschutzversicherung',
    explanation: 'Übernimmt Anwalts- und Gerichtskosten, wenn du in einen Rechtsstreit gerätst.',
  },
  {
    keywords: ['kranken', 'zusatz'],
    label: 'Krankenzusatzversicherung',
    explanation: 'Ergänzt die Grundversicherung z.B. um freie Arztwahl, Zahnbehandlungen oder Spitalkomfort.',
  },
  {
    keywords: ['todesfall', 'risikoleben', 'lebensversicherung'],
    label: 'Todesfall-/Risikolebensversicherung',
    explanation: 'Sichert deine Familie finanziell ab, falls dir etwas zustösst.',
  },
  {
    keywords: ['3a', 'säule 3a', 'saeule 3a'],
    label: 'Säule 3a',
    explanation:
      'Nicht nur Vorsorge fürs Alter: Einzahlungen kannst du jedes Jahr bis zum gesetzlichen Maximalbetrag von deinem steuerbaren Einkommen abziehen – eine der einfachsten Steuerersparnisse überhaupt.',
  },
]

export function findCoverageGaps(existingSparten: string[], baseline: CoverageBaselineItem[]) {
  const lowerSparten = existingSparten.map((s) => s.toLowerCase())
  return baseline.filter((item) => !item.keywords.some((k) => lowerSparten.some((s) => s.includes(k))))
}

export const lifeEventOptions = [
  { value: 'heirat', label: 'Heirat' },
  { value: 'kind', label: 'Nachwuchs' },
  { value: 'umzug', label: 'Umzug' },
  { value: 'jobwechsel', label: 'Jobwechsel' },
  { value: 'fahrzeug', label: 'Neues Fahrzeug' },
  { value: 'wohneigentum', label: 'Wohneigentum erworben' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const

export const SONSTIGES_LIFE_EVENT_VALUE = 'sonstiges'
