import { createMiddleware } from "hono/factory"
import {
  authenticateApiToken,
  ServiceError,
} from "@passline/core"
import { loadEnv } from "./env"
import { authenticateSupabaseJwt } from "./jwt-auth"
import { checkRateLimit } from "./rate-limit"
import { getServiceDb } from "./supabase"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export type AuthVariables = {
  // userId: string
  supabase: SupabaseClient
  userId: string
  tokenId: string | null
  authMethod: "api_token" | "jwt"
}

/**
 * Bearer auth for /mcp:
 * 1) Personal API token `pln_…` (primary)
 * 2) Supabase access JWT (Phase 5 OAuth / connectors)
 */
export const apiTokenAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization")
    if (!header?.startsWith("Bearer ")) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized: missing Bearer API token or JWT",
          },
          id: null,
        },
        401,
      )
    }

    const rawToken = header.slice("Bearer ".length).trim()
    if (!rawToken) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Unauthorized: empty Bearer token" },
          id: null,
        },
        401,
      )
    }

    try {
      let userId: string
      let tokenId: string | null = null
      let authMethod: "api_token" | "jwt" = "api_token"

      if (rawToken.startsWith("pln_")) {
        const auth = await authenticateApiToken(getServiceDb(), rawToken)
        userId = auth.userId
        tokenId = auth.tokenId
      } else {
        const env = loadEnv()
        const auth = await authenticateSupabaseJwt(rawToken, env.supabaseUrl)
        userId = auth.userId
        authMethod = "jwt"
      }

      const limit = checkRateLimit(userId)
      if (!limit.allowed) {
        c.header("Retry-After", String(limit.retryAfterSeconds ?? 60))
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32003,
              message: limit.reason ?? "Rate limit exceeded",
            },
            id: null,
          },
          429,
        )
      }

      c.set("userId", userId)
      c.set("tokenId", tokenId)
      c.set("authMethod", authMethod)
      await next()
    } catch (err) {
      if (err instanceof ServiceError && err.status === 401) {
        return c.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: err.message },
            id: null,
          },
          401,
        )
      }
      if (err instanceof Error && err.message.includes("Missing SUPABASE")) {
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: `Server misconfigured: ${err.message}`,
            },
            id: null,
          },
          500,
        )
      }
      throw err
    }
  },
)
