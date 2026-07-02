import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export function useInboxCount() {
  const { staffProfile } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!staffProfile) return

    const refreshCount = async () => {
      const [{ count: reqCount }, { count: oppCount }] = await Promise.all([
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])
      setCount((reqCount ?? 0) + (oppCount ?? 0))
    }

    refreshCount()

    const channel = supabase
      .channel('inbox-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        if (payload.eventType === 'INSERT') toast.info('Neue Anfrage im Posteingang.')
        refreshCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, (payload) => {
        if (payload.eventType === 'INSERT') toast.info('Neue Chance im Posteingang.')
        refreshCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [staffProfile?.organization_id])

  return count
}
