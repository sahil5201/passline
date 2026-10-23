import { StreamableHTTPTransport } from "@hono/mcp"
import { Hono } from "hono"
import { RUBRIC_VERSION } from "@passline/core"
import { apiTokenAuth, type AuthVariables } from "./auth"
import { loadEnv } from "./env"
import { createMcpServerForUser } from "./mcp/create-server"
import { MCP_TOOLS } from "./mcp/tools"
import { getServiceDb } from "./supabase"
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { supabaseOAuthAuth } from "./auth/supabase-oauth"

const app = new Hono<{ Variables: AuthVariables }>()
const PUBLIC_URL = (Bun.env.PUBLIC_URL ?? "https://mcp.jsdevsahil.xyz").replace(/\/$/, "")
const customLogger = (
  message: string,
  ...rest: string[]
) => {
  console.log(message, ...rest)
}

app.use(logger())
app.use('*', async (c, next) => {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'

  const hostname = new URL(c.req.url).hostname

  customLogger(
    `[${ip}] [${hostname}] ${c.req.method} ${c.req.path}`,
  )

  await next()
})
app.use('*', cors())

// 1. Define your OAuth Metadata configuration payload
const oauthMetadata = {
  issuer: "https://mcp.jsdevsahil.xyz",
  authorization_endpoint: "https://mcp.jsdevsahil.xyz/oauth/authorize", // Update to your actual auth route
  token_endpoint: "https://mcp.jsdevsahil.xyz/oauth/token",             // Update to your actual token route
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  // Add any additional standard OAuth metadata fields your setup requires
}

// 2. Register all variations ChatGPT is checking based on your logs
const discoveryPaths = [
  '/.well-known/oauth-authorization-server/mcp',
  '/.well-known/oauth-authorization-server',
  '/mcp/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration/mcp',
  '/.well-known/openid-configuration',
  '/mcp/.well-known/openid-configuration'
]

// 3. Bind the routes to serve the configuration
discoveryPaths.forEach(path => {
  app.get(path, (c) => {
    return c.json(oauthMetadata)
  })
})

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "passline-mcp",
    version: "1.0.0",
    phase: "all",
    rubric_version: RUBRIC_VERSION,
    tools: MCP_TOOLS,
  }),
)

/**
 * OAuth 2.1 protected resource metadata (MCP clients discover this).
 * Full consent UI lives in the Next.js app later; metadata enables connector discovery.
 */
app.get("/.well-known/oauth-protected-resource", (c) => {
  const base = new URL(PUBLIC_URL)
  const resource = `${PUBLIC_URL}/mcp`
  console.log('origin', base.origin)
  console.log('resource', resource)

  let supabaseAuth: string | undefined
  try {
    supabaseAuth = `${loadEnv().supabaseUrl.replace(/\/$/, "")}/auth/v1`
  } catch {
    supabaseAuth = undefined
  }

  return c.json({
    resource: resource,
    authorization_servers: supabaseAuth ? [supabaseAuth] : [],
    scopes_supported: ["openid", "profile", "email"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${base.origin}/health`,
  })
})

// app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
//   const url = new URL(`${PUBLIC_URL}/mcp`)
//   url.pathname = "/.well-known/oauth-protected-resource"
//   return c.redirect(url.toString(), 307)
// })

app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
  // return JSON directly instead of redirecting
  const supabaseAuth = `${loadEnv().supabaseUrl.replace(/\/$/, "")}/auth/v1`
  return c.json({
    resource: `${PUBLIC_URL}/mcp`,
    authorization_servers: [supabaseAuth],
    scopes_supported: ["openid", "profile", "email"],
    bearer_methods_supported: ["header"],
  })
})

/**
 * Stateless MCP endpoint:
 * auth (API token or JWT) → rate limit → fresh McpServer + transport per request.
 */
app.all("/mcp", supabaseOAuthAuth, async (c) => {
  const userId = c.get("userId")
  const db = getServiceDb()
  const mcpServer = createMcpServerForUser(db, userId)
  const transport = new StreamableHTTPTransport()
  await mcpServer.connect(transport)
  return transport.handleRequest(c)
})

// const env = (() => {
//   try {
//     return loadEnv()
//   } catch (err) {
//     console.warn(
//       `[passline-mcp] Env not fully configured yet: ${err instanceof Error ? err.message : String(err)}`,
//     )
//     console.warn(
//       "[passline-mcp] /health works; /mcp requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
//     )
//     return { port: Number(Bun.env.MCP_PORT ?? 8001) || 8001 }
//   }
// })()

export default {
  fetch: app.fetch,
  port: 8080,
  hostname: '0.0.0.0',
}