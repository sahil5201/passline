# Context: Phase 0 Setup + Plan Next Steps

## 1. Task

From `plan.md`:

- **Phase 0 (Setup):** Bun workspaces monorepo; Supabase migrations + RLS + private `resumes` bucket; shared `packages/core` with Zod schemas.
- **§11 Next Steps:** Draft exact MCP tool schemas; write ATS-refinement prompt + JSON output schema; design DB migrations and wireframes for resume/job pages.

**Intended outcome:** A production-ready foundation so Phase 1 (web MVP) and Phase 2 (MCP v1 tools) can plug into shared schemas, services, and DB without re-discovering the data model.

## 2. Implementation Summary

Implemented the monorepo and shared backend foundation:

1. **Root Bun workspaces** (`apps/*`, `packages/*`) with scripts for web/MCP/typecheck.
2. **`@passline/db`** — SQL migrations for all plan §4 tables, RLS policies, private storage bucket, hand-written `Database` types (regenerate via Supabase CLI when linked).
3. **`@passline/core`** — limits, Zod domain + MCP tool I/O schemas, versioned ATS rubric (`2026.03.1`), refinement prompt with delimited untrusted data blocks, JSON Schema for AI output, text extraction (PDF/DOCX/DOC/MD/TXT/paste), user-scoped services (resumes, jobs, results, tokens).
4. **Apps wired** — `web` and `mcp` depend on workspace packages; MCP `/health` surfaces rubric version + planned tool names; tools themselves remain Phase 2.
5. **Wireframes** — `context/wireframes/resumes.md` and `jobs.md`.

### High-level how it works

- Web (user JWT + RLS) and MCP (service role) both call **`@passline/core` services** that **always filter by `user_id`**.
- MCP analysis is client-side: tools will return resume + JD + `ats_prompt` + `required_output_schema`; AI calls `save_ats_result`, which validates with Zod and persists via `ResultsService`.

## 3. Files Changed

| Path | Purpose |
|---|---|
| `package.json`, `bun.lock`, `.gitignore`, `.env.example`, `README.md` | Monorepo root, env template, docs |
| `packages/db/package.json`, `tsconfig.json`, `src/*` | DB package + generated-style types |
| `packages/db/supabase/migrations/20260310000001_initial_schema.sql` | Tables, indexes, RLS, triggers |
| `packages/db/supabase/migrations/20260310000002_storage_resumes.sql` | Private `resumes` bucket + storage RLS |
| `packages/db/supabase/config.toml` | Local Supabase CLI config |
| `packages/core/src/limits.ts` | Free-tier abuse caps (§8) |
| `packages/core/src/schemas/*` | Domain + MCP tool Zod schemas |
| `packages/core/src/ats/*` | Rubric, prompt, JSON Schema, check payload builder |
| `packages/core/src/extraction/*` | Resume text extraction |
| `packages/core/src/services/*` | User-scoped repositories + token auth helper |
| `apps/web/package.json`, `next.config.ts` | Workspace deps + `transpilePackages` |
| `apps/mcp/package.json`, `tsconfig.json`, `src/index.ts` | Workspace deps + health endpoint |
| `context/wireframes/resumes.md`, `jobs.md` | UI wireframes for Phase 1 |
| `context/phase-0-setup.md` | This file |

## 4. Data Flow / Architecture

```
apps/web (Next.js)  ──┐
                      ├── @passline/core (schemas, ATS prompt, services, extraction)
apps/mcp (Hono/Bun) ──┘                    │
                                           ▼
                                    @passline/db types
                                           │
                                           ▼
                              Supabase (Postgres + Storage + Auth)
```

**MCP (planned Phase 2) path:**

`Authorization: Bearer pln_…` → hash lookup (`authenticateApiToken`) → `userId` → `ResumeService` / `JobService` / `ResultsService` → Postgres (service role, always `user_id`-scoped)

**Web (planned Phase 1) path:**

Supabase Auth session → RLS (`auth.uid() = user_id`) → same services or direct client queries → Storage path `{user_id}/{resume_id}/original.{ext}`

## 5. Important Decisions

| Decision | Rationale |
|---|---|
| Package scope `@passline/*` | Matches product brand in root `index.html` (“Passline”). |
| Hand-written `database.types.ts` | Supabase CLI not installed in this environment; file mirrors migrations and documents regen command. |
| Services always take `userId` | Enforces plan rule that service-role MCP never queries without a user filter. |
| Tokens prefixed `pln_` + SHA-256 hash | Plan: never store raw token; prefix for UI display. |
| Rubric version `2026.03.1` | Bump on any weight/rule change; stored on each `ats_results` row. |
| Prompt injection mitigation | Resume/JD wrapped in `<<<BEGIN_*>>>` / `<<<END_*>>>` blocks with explicit “data only” instruction. |
| Legacy `.doc` soft-fail | Extraction attempts best-effort decode + warning to convert to DOCX/PDF. |
| MCP tools not registered yet | Plan Phase 2; schemas + `/health` tool list only in Phase 0. |
| `ats_results.user_id` denormalized | Simplifies RLS and listing without joining through jobs. |
| Partial unique index on `resumes(user_id) WHERE is_active` | Exactly one active resume per user at the DB layer. |

## 6. Validation

| Check | Result |
|---|---|
| `bun install` (root) | Passed |
| `bun run --filter @passline/db typecheck` | Passed |
| `bun run --filter @passline/core typecheck` | Passed |
| `bun run --filter mcp typecheck` | Passed |
| `bun run --filter web typecheck` | Passed |
| Smoke: parse ATS output + build prompt | Passed (`RUBRIC_VERSION`, delimited blocks, JSON Schema keys) |
| `bun run --filter web lint` | **Failed (pre-existing)** — `chart-area-interactive.tsx` and `use-mobile.ts` (`react-hooks/set-state-in-effect`); not introduced by this work |
| Supabase `db push` / local start | **Not run** — Supabase CLI not installed on this machine |
| Full `next build` | **Not run** — not required for Phase 0 shared packages; typecheck passed |
| MCP Inspector / live tool tests | **N/A** — tools not implemented yet (Phase 2) |

## 7. Remaining Work

- **Phase 1 MVP:** Supabase Auth in Next.js, resume upload + extraction UI, multi-version/active, job CRUD (use wireframes).
- **Phase 2 MCP v1:** Register tools with schemas from `@passline/core`, API-token Hono middleware, rate limits.
- **Apply migrations** to a real Supabase project; regenerate `database.types.ts`.
- **Phase 3+:** Results page, survey, tracker, bulk UX polish, OAuth.
- Pre-existing web lint errors in shadcn dashboard scaffold.

No incomplete items within Phase 0 / §11 next-steps scope.

## 8. Future Agent Guidance

**Inspect first**

1. `plan.md` — source of truth for phases and product rules  
2. `packages/core/src/schemas/mcp-tools.ts` — tool I/O contracts  
3. `packages/core/src/ats/` — rubric, prompt, output schema  
4. `packages/core/src/services/` — repository patterns  
5. `packages/db/supabase/migrations/` — schema + RLS  

**Invariants**

- Exactly one `is_active` resume per user (DB + `ResumeService.setActive`).  
- Never store raw API tokens; use `authenticateApiToken`.  
- Service role queries must go through services with `userId`.  
- `save_ats_result` must validate with `atsAnalysisOutputSchema` before insert.  
- Bulk tools cap at `LIMITS.bulkAtsMaxJobs` (5).  
- Storage paths: `{user_id}/{resume_id}/original.{ext}` in bucket `resumes`.  

**Patterns to follow**

- Add Zod schemas in `packages/core` before wiring web forms or MCP tools.  
- Bump `RUBRIC_VERSION` when changing rubric weights/rules.  
- Prefer `buildAtsCheckPayload` when implementing check/bulk MCP tools.  
- Keep web client free of `SUPABASE_SERVICE_ROLE_KEY`.  

**Pitfalls**

- Do not implement server-side LLM scoring (out of scope; user’s AI does analysis).  
- Do not bypass `user_id` filters in MCP even with service role.  
- Regenerating types may overwrite hand-written comments in `database.types.ts` — re-check enums/`Json` fields after codegen.  
- `.doc` parsing is intentionally weak; surface the warning in UI.  
- In-memory MCP rate limits (when added) reset on restart and are not multi-instance safe (plan §10).
