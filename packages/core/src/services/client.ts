import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@passline/db"

export type PasslineSupabase = SupabaseClient<Database>

/**
 * Browser/user-scoped client (respects RLS via the user's JWT).
 * Use from Next.js with the anon key + user session.
 */
export function createUserSupabaseClient(opts: {
  url: string
  anonKey: string
  accessToken?: string
}): PasslineSupabase {
  return createClient<Database>(opts.url, opts.anonKey, {
    global: opts.accessToken
      ? { headers: { Authorization: `Bearer ${opts.accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Service-role client (bypasses RLS). MCP and trusted server routes only.
 * NEVER ship the service role key to the browser.
 * All queries MUST still filter by user_id via the repository services.
 */
export function createServiceSupabaseClient(opts: {
  url: string
  serviceRoleKey: string
}): PasslineSupabase {
  return createClient<Database>(opts.url, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
