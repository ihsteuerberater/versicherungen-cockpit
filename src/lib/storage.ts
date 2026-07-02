import { supabase } from './supabase'

// Supabase Storage lehnt Schlüssel mit Leerzeichen/Sonderzeichen (z.B. Umlaute,
// Mittelpunkt) mit "Invalid key" ab – Original-Dateinamen müssen dafür bereinigt werden.
export function sanitizeFileName(name: string): string {
  return name.normalize('NFKD').replace(/[^\w.-]+/g, '_')
}

// Storage-Uploads sind besonders empfindlich auf ein kurz vor Ablauf stehendes
// Zugriffstoken (führt sonst zu einem irreführenden "row-level security"-Fehler,
// obwohl eigentlich nur die Sitzung erneuert werden muss). Deshalb hier aktiv
// auffrischen, statt uns auf den automatischen Hintergrund-Refresh zu verlassen.
export async function ensureFreshSession() {
  const { data } = await supabase.auth.getSession()
  const expiresAt = data.session?.expires_at
  const expiringSoon = !expiresAt || expiresAt * 1000 - Date.now() < 60_000
  if (expiringSoon) {
    await supabase.auth.refreshSession()
  }
}

export async function uploadBrandingFile(path: string, file: File): Promise<string> {
  await ensureFreshSession()
  // Kein upsert nötig – der Zeitstempel im Pfad macht jeden Dateinamen ohnehin eindeutig.
  const { error } = await supabase.storage.from('branding').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('branding').getPublicUrl(path)
  return data.publicUrl
}
