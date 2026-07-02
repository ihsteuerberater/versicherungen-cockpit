// Reine String-Umformatierung (kein new Date()), damit Zeitzonen-Verschiebungen
// bei reinen Datumswerten (ohne Uhrzeit) nie zu einem falschen Tag führen können.
export function formatDate(value: string | null): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}
