# Context: Phase 2 — MCP v1

## 1. Task

From `plan.md` Phase 2:

> Hono + Bun server with API-token auth, `list_resumes`, `get_resume`, `check_ats_compatibility`, `save_ats_result`. Test with MCP Inspector, then Claude.

User guidance for this pass: implement Phase 2; **do not** spend effort on Bun workspaces / monorepo setup.

**Intended outcome:** A working `/mcp` endpoint that authenticates personal API tokens, rate-limits per user, and exposes the four MVP tools backed by `@passline/core` services (service-role Supabase, always `user_id`-scoped).

## 2. Implementation Summary

Implemented inside `apps/mcp` only (reuses existing `@passline/core`):

1. **Env + Supabase** — `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY`; service client via `createServiceSupabaseClient`.
2. **Auth middleware** — `Authorization: Bearer pln_…` → `authenticateApiToken` (hash lookup, reject revoked, update `last_used_at`).
3. **In-memory rate limits** — per-user minute/day caps from `LIMITS` (plan §8/§10).
4. **Stateless MCP** — fresh `McpServer` + `StreamableHTTPTransport` per `/mcp` request; tools closed over authenticated `userId`.
5. **Tools**
   - `list_resumes` — resume summaries
   - `get_resume` — text (default) or signed URL (`format: "original"`)
   - `check_ats_compatibility` — resume + JD + prompt + required output schema (`buildAtsCheckPayload`)
   - `save_ats_result` — Zod-validate analysis, create job if needed, persist, mark `analyzed`
6. **Public `/health`** — lists implemented v1 tools (no auth).

### High-level flow

```
Client (Inspector / Claude)
  → Authorization: Bearer pln_…
  → POST/GET /mcp
  → apiTokenAuth + rate limit
  → createMcpServerForUser(db, userId)
  → tool handler → ResumeService / JobService / ResultsService
  → Supabase (service role, user_id filtered in services)
```

## 3. Files Changed

| Path | Purpose |
|---|---|
| `apps/mcp/src/index.ts` | Hono app: `/health`, authenticated `/mcp` |
| `apps/mcp/src/env.ts` | Env loading for Supabase + port |
| `apps/mcp/src/supabase.ts` | Lazy service-role client |
| `apps/mcp/src/auth.ts` | Bearer token middleware |
| `apps/mcp/src/rate-limit.ts` | In-memory per-user limits |
| `apps/mcp/src/mcp/create-server.ts` | Per-request `McpServer` factory |
| `apps/mcp/src/mcp/tools.ts` | Registers the four v1 tools |
| `apps/mcp/src/mcp/respond.ts` | structuredContent / error helpers |
| `apps/mcp/src/mcp/storage-path.ts` | Resolve storage path for signed URLs |
| `apps/mcp/README.md` | Run + Inspector notes |
| `.env.example` | Documented `SUPABASE_URL` for MCP |
| `README.md` | Phase status update |
| `context/phase-2-mcp-v1.md` | This file |

No monorepo/workspace changes.

## 4. Data Flow / Architecture

```
MCP client
  → apps/mcp (Hono)
      ├─ /health (public)
      └─ /mcp + Bearer token
           → authenticateApiToken (@passline/core)
           → checkRateLimit
           → McpServer tools
                → ResumeService / JobService / ResultsService
                     → Supabase service role (always .eq("user_id", …))
```

Shared contracts live in `packages/core/src/schemas/mcp-tools.ts` and ATS helpers in `packages/core/src/ats/`.

## 5. Important Decisions

| Decision | Rationale |
|---|---|
| Stateless server per request | Plan §6; no session state needed for these tools |
| Auth before MCP handling | Reject invalid tokens with HTTP 401 JSON-RPC-shaped errors |
| Reuse core Zod schemas as `inputSchema`/`outputSchema` | Single source of truth; return `structuredContent` + JSON text |
| Signed URL path resolver | Supports stored relative path, Supabase object URL, or reconstructed `{user}/{id}/original.{ext}` |
| Soft-start without env | `/health` still runs; `/mcp` returns 500 misconfigured until keys are set |
| Skipped monorepo work | Per user request; existing `@passline/core` imports unchanged |
| Deferred: bulk tools, OAuth, web token UI | Later phases (bulk = Phase 4; OAuth = Phase 5; token UI = Phase 1) |

## 6. Validation

| Check | Result |
|---|---|
| `bun run --filter mcp typecheck` | Passed |
| Import smoke (`MCP_V1_TOOLS`) | Passed |
| `GET /health` | Passed — returns v1 tool list + rubric version |
| `POST /mcp` without Bearer | Passed — `401` missing token |
| `POST /mcp` with Bearer but no Supabase env | Passed — `500` server misconfigured (expected until `.env` is set) |
| Live tool calls against Supabase | **Not run** — no `SUPABASE_*` credentials / no seeded `api_tokens` in this environment |
| MCP Inspector / Claude | **Not run** — needs live env + a real `pln_` token (Phase 1 token UI or manual DB insert) |

## 7. Remaining Work

- Apply DB migrations and seed/create an API token (Phase 1 settings page, or manual insert of SHA-256 hash).
- End-to-end: MCP Inspector → `list_resumes` / `check_ats_compatibility` / `save_ats_result` against real data.
- Phase 1 web MVP so resumes/jobs/tokens exist without manual SQL.
- Later MCP tools: `list_pending_jobs`, `run_bulk_ats_check`, optional `set_active_resume`, `update_application_status`.
- Move rate limits to Redis/Postgres when scaling beyond one instance.

## 8. Future Agent Guidance

**Inspect first**

1. `apps/mcp/src/index.ts` — route wiring  
2. `apps/mcp/src/mcp/tools.ts` — tool handlers  
3. `apps/mcp/src/auth.ts` — token middleware  
4. `packages/core/src/schemas/mcp-tools.ts` — input/output contracts  
5. `packages/core/src/services/*` — data access  

**Invariants**

- Never query without `userId` (services enforce this).  
- Never log or persist raw Bearer tokens.  
- `save_ats_result` must validate with `atsAnalysisOutputSchema` (done inside `ResultsService`).  
- `/health` stays public; `/mcp` requires Bearer.  

**Patterns**

- Add tools by extending `registerMcpV1Tools` (or a new register function) using core Zod schemas.  
- Use `toolSuccess` / `toolError` for consistent MCP results.  
- Prefer `buildAtsCheckPayload` for any new check/bulk tools.  

**Pitfalls**

- Closing the transport immediately after `handleRequest` can break streaming — leave request-scoped instances alone.  
- `format: "original"` fails for paste-only resumes (no file) — expected.  
- In-memory rate limits reset on restart and are not multi-instance safe.  
- Without Phase 1, there is no UI to mint `pln_` tokens; hash must be `sha256(rawToken)` in `api_tokens`.
