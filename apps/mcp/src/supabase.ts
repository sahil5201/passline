import {
  createServiceSupabaseClient,
  type PasslineSupabase,
} from "@passline/core"
import { loadEnv } from "./env"

let client: PasslineSupabase | null = null

export function getServiceDb(): PasslineSupabase {
  if (client) return client
  const env = loadEnv()
  client = createServiceSupabaseClient({
    url: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  })
  return client
}
