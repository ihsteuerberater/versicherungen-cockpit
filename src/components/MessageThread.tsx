import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { extractErrorMessage } from '../lib/errors'
import { cn } from '@/lib/utils'
import type { MessageSenderRole, RequestMessage } from '../lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageThreadProps {
  requestId: string
  organizationId: string
  senderRole: MessageSenderRole
  senderId: string
}

export function MessageThread({ requestId, organizationId, senderRole, senderId }: MessageThreadProps) {
  const [messages, setMessages] = useState<RequestMessage[] | null>(null)
  const [draft, setDraft] = useState('')

  const load = async () => {
    const { data } = await supabase.from('request_messages').select('*').eq('request_id', requestId).order('created_at')
    setMessages(data ?? [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`request-messages-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_messages', filter: `request_id=eq.${requestId}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId])

  const send = async () => {
    if (!draft.trim()) return
    try {
      const { error } = await supabase.from('request_messages').insert({
        organization_id: organizationId,
        request_id: requestId,
        sender_role: senderRole,
        sender_id: senderId,
        message: draft.trim(),
      })
      if (error) throw error
      setDraft('')
      await load()
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
        {messages === null && <p className="text-sm text-muted-foreground">Lädt…</p>}
        {messages?.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>}
        {messages?.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[80%] rounded-lg px-3 py-2 text-sm',
              m.sender_role === senderRole ? 'ml-auto bg-primary text-primary-foreground' : 'bg-background',
            )}
          >
            <p>{m.message}</p>
            <p className="mt-1 text-[10px] opacity-70">
              {new Date(m.created_at).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Nachricht schreiben…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button onClick={send}>Senden</Button>
      </div>
    </div>
  )
}
