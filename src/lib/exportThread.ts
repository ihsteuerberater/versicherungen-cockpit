import type { RequestMessage } from './types'

export function downloadThreadAsText(title: string, messages: RequestMessage[]) {
  const lines = messages.map((m) => {
    const who = m.sender_role === 'kunde' ? 'Du' : 'Berater'
    const when = new Date(m.created_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })
    return `[${when}] ${who}: ${m.message}`
  })
  const content = `${title}\n${'='.repeat(title.length)}\n\n${lines.join('\n')}\n`

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^\w\-]+/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
