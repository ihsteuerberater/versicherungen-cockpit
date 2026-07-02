import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PolicyDocument } from '../lib/types'
import { FileText } from 'lucide-react'

export function RequestAttachments({ requestId }: { requestId: string }) {
  const [documents, setDocuments] = useState<(PolicyDocument & { url: string | null })[] | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('documents').select('*').eq('request_id', requestId)
      const withUrls = await Promise.all(
        (data ?? []).map(async (doc) => {
          const { data: signed } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60 * 60)
          return { ...doc, url: signed?.signedUrl ?? null }
        }),
      )
      setDocuments(withUrls)
    }
    load()
  }, [requestId])

  if (!documents || documents.length === 0) return null

  return (
    <div className="space-y-1.5 border-b pb-3">
      <p className="text-sm font-medium">Angehängte Dokumente</p>
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={doc.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <FileText className="size-4" /> {doc.file_path.split('/').pop()}
        </a>
      ))}
    </div>
  )
}
