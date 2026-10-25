
import { createClient } from "@supabase/supabase-js"
import type { MiddlewareHandler } from "hono"
import type { AuthVariables } from "../auth"
import { loadEnv } from "../env"

const metadataUrl =
  "https://mcp.jsdevsahil.xyz/.well-known/oauth-protected-resource/mcp"

export const supabaseOAuthAuth: MiddlewareHandler<{
  Variables: AuthVariables
}> = async (c, next) => {
  const authorization = c.req.header("Authorization")
  const match = authorization?.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return c.json(
      { error: "unauthorized" },
      401,
      {
        "WWW-Authenticate":
          `Bearer resource_metadata="${metadataUrl}"`,
      },
    )
  }

  const token = match[1]
  const env = loadEnv()

  const supabase = createClient(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json(
      { error: "invalid_token" },
      401,
      {
        "WWW-Authenticate":
          `Bearer error="invalid_token", resource_metadata="${metadataUrl}"`,
      },
    )
  }

  c.set("userId", data.user.id)
  c.set("supabase", supabase)

  await next()
}
