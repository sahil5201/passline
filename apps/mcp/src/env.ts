export type McpEnv = {
  port: number
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

export function loadEnv(): McpEnv {
  const supabaseUrl =
    Bun.env.SUPABASE_URL?.trim() ||
    Bun.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  const supabaseServiceRoleKey =
    Bun.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ""
  const port = Number(Bun.env.MCP_PORT ?? Bun.env.PORT ?? 8001)

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for the MCP server",
    )
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for the MCP server")
  }

  return {
    port: Number.isFinite(port) && port > 0 ? port : 8001,
    supabaseUrl,
    supabaseServiceRoleKey,
  }
}
