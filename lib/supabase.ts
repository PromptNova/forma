import { createClient } from '@supabase/supabase-js'

// ── Supabase client singleton ─────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !key) {
  console.warn(
    '[Forma] Missing Supabase env vars. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
    'in .env.local or Vercel Dashboard. ' +
    'Cloud save/sync features will be disabled.'
  )
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// ── Auth helpers ──────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, username?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username || email.split('@')[0] } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Design helpers ────────────────────────────────────────────
export interface DesignRow {
  id: string
  user_id: string
  name: string
  parts: unknown[]
  theme: string
  is_stable: boolean | null
  stability_score: number | null
  total_weight_kg: number | null
  total_cost_eur: number | null
  height_cm: number | null
  is_public: boolean
  share_token: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export async function saveDesignToSupabase(design: {
  name: string
  parts: unknown[]
  theme: string
  userId: string
}): Promise<DesignRow> {
  const { data, error } = await supabase
    .from('designs')
    .insert({
      user_id: design.userId,
      name: design.name,
      parts: design.parts,
      theme: design.theme,
    })
    .select()
    .single()

  if (error) throw error
  return data as DesignRow
}

export async function updateDesignInSupabase(
  designId: string,
  updates: Partial<Pick<DesignRow, 'name' | 'parts' | 'theme'>>
): Promise<DesignRow> {
  const { data, error } = await supabase
    .from('designs')
    .update(updates)
    .eq('id', designId)
    .select()
    .single()

  if (error) throw error
  return data as DesignRow
}

export async function loadDesignsFromSupabase(userId: string): Promise<DesignRow[]> {
  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data || []) as DesignRow[]
}

export async function shareDesignInSupabase(designId: string): Promise<string> {
  // First get the current share_token
  const { data: existing, error: fetchError } = await supabase
    .from('designs')
    .select('share_token')
    .eq('id', designId)
    .single()

  if (fetchError) throw fetchError

  const token = existing?.share_token || crypto.randomUUID().replace(/-/g, '')

  const { error } = await supabase
    .from('designs')
    .update({ is_public: true, share_token: token })
    .eq('id', designId)

  if (error) throw error
  return token
}

export async function deleteDesignFromSupabase(designId: string): Promise<void> {
  const { error } = await supabase
    .from('designs')
    .delete()
    .eq('id', designId)

  if (error) throw error
}
