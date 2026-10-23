# Passline

ATS resume checker: Next.js web app + MCP server, sharing Supabase and `@passline/core`.

See [plan.md](./plan.md) for product architecture.

## Monorepo

```
apps/web          Next.js + shadcn/ui
apps/mcp          Hono + MCP (Bun)
packages/core     Zod schemas, ATS rubric/prompt, extraction, services
packages/db       Supabase migrations + Database types
```

## Setup

```bash
bun install
```

Copy `.env.example` values into `apps/web/.env.local` and `apps/mcp/.env` (or root `.env`).

### Database

```bash
supabase --workdir packages/db db push
```

## Scripts

```bash
bun run dev:web      # Next.js
bun run dev:mcp      # MCP on :8001
bun run typecheck
```

## Features (phases 0–5)

| Area | Status |
|---|---|
| Shared core + DB migrations | Done |
| Auth, resumes, jobs, MCP tokens | Done (web) |
| MCP tools (incl. bulk + optional) | Done |
| Results, survey, tracker insights | Done |
| Rate limits, JWT auth, OAuth metadata | Done (foundation) |
| Server-side LLM scoring / billing | Out of scope (phase 6 later) |

Context: `context/all-phases.md`
