import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { PasslineSupabase } from "@passline/core"
import { registerMcpTools } from "./tools"

/** Fresh McpServer per request (stateless mode, plan §6). */
export function createMcpServerForUser(
  db: PasslineSupabase,
  userId: string,
): McpServer {
  const server = new McpServer({
    name: "passline-mcp",
    version: "1.0.0",
  })

  registerMcpTools(server, db, userId)
  return server
}
