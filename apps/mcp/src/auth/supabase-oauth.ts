
import { createClient } from "@supabase/supabase-js"
import type { MiddlewareHandler } from "hono"
import type { AuthVariables } from "../auth"
import { loadEnv } from "../env"

export const supabaseOAuthAuth: MiddlewareHandler<{
  Variables: AuthVariables
}> = async (c, next) => {
  const authorization = c.req.header("Authorization")
  const match = authorization?.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return c.json({ error: "unauthorized" }, 401, {
      "WWW-Authenticate":
        'Bearer resource_metadata="/.well-known/oauth-protected-resource"',
    })
  }

  const token = match[1]
  const env = loadEnv()

  // Create a client for THIS request, using the caller's token.
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  // Ask Supabase Auth to verify the token and resolve the user.
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: "invalid_token" }, 401, {
      "WWW-Authenticate":
        'Bearer error="invalid_token", resource_metadata="/.well-known/oauth-protected-resource"',
    })
  }

  // Preserve the verified identity and the user-scoped DB client.
  c.set("userId", data.user.id)

  // Add this field to AuthVariables in the next step.
  c.set("supabase", supabase)

  await next()
}
