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
const PUBLIC_URL = (Bun.env.MCP_PUBLIC_URL ?? "https://mcp.jsdevsahil.xyz").replace(/\/$/, "")
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
// app.use('*', cors())
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type", "Mcp-Session-Id", "Mcp-Protocol-Version"],
  exposeHeaders: ["WWW-Authenticate", "Mcp-Session-Id"],
}))

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

const SUPABASE_ISSUER =
  `${loadEnv().supabaseUrl.replace(/\/$/, "")}/auth/v1`

// app.get("/.well-known/oauth-protected-resource", (c) => {
//   return c.json({
//     resource: `${PUBLIC_URL}/mcp`,
//     authorization_servers: [SUPABASE_ISSUER],
//     bearer_methods_supported: ["header"],
//     resource_documentation: `${PUBLIC_URL}/health`,
//   })
// })

// app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
//   return c.json({
//     resource: `${PUBLIC_URL}/mcp`,
//     authorization_servers: [SUPABASE_ISSUER],
//     bearer_methods_supported: ["header"],
//   })
// })

const metadata = {
  resource: `${PUBLIC_URL}/mcp`,
  authorization_servers: [SUPABASE_ISSUER],
  scopes_supported: ["openid", "email", "profile"],
  bearer_methods_supported: ["header"],
  resource_documentation: `${PUBLIC_URL}/health`,
}

app.get("/.well-known/oauth-protected-resource", (c) => c.json(metadata))
app.get("/.well-known/oauth-protected-resource/mcp", (c) => c.json(metadata))

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