import { ServiceError } from "@passline/core"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { ZodError } from "zod"

export function toolSuccess<T extends Record<string, unknown>>(
  data: T,
): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}

export function toolError(err: unknown): CallToolResult {
  if (err instanceof ServiceError) {
    return {
      content: [{ type: "text", text: `${err.code}: ${err.message}` }],
      isError: true,
    }
  }
  if (err instanceof ZodError) {
    return {
      content: [
        {
          type: "text",
          text: `VALIDATION: ${err.issues.map((i) => i.message).join("; ")}`,
        },
      ],
      isError: true,
    }
  }
  const message = err instanceof Error ? err.message : String(err)
  return {
    content: [{ type: "text", text: `ERROR: ${message}` }],
    isError: true,
  }
}
