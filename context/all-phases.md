# Context: All Phases Implementation (0–5)

## 1. Task

Implement remaining plan phases in one pass:

| Phase | Scope |
|---|---|
| 0 | Already done (core/db scaffolding) |
| 1 | Auth, resumes, jobs, API tokens (web MVP) |
| 2 | Already done (MCP v1 core tools) |
| 3 | Results view, survey, tracker dashboard |
| 4 | Bulk queue + `list_pending_jobs` / `run_bulk_ats_check` |
| 5 | Rate limits, JWT auth, OAuth metadata, insights / version comparison |
| 6 | **Skipped** (later: server-side LLM scoring, billing) |

## 2. Implementation Summary

### Web (`apps/web`)

- Supabase Auth via `@supabase/ssr` (middleware session refresh, login/signup, callback).
- App shell with real nav: Dashboard, Resumes, Jobs, Tracker, Settings.
- Resumes: upload (extract via `@passline/core`), paste, set active, edit extracted text, delete, storage path `{user}/{id}/original.{ext}`.
- Jobs: CRUD, queue/unqueue, score badges from latest `ats_results`.
- Job detail: ATS result display, post-result survey, edit form.
- Tracker: kanban-style columns + table + response-rate / score-by-resume insights.
- Settings: create/revoke/delete MCP tokens (shown once), delete-my-data, OAuth notes page.

### MCP (`apps/mcp`)

- All tools registered (v1 + bulk + optional).
- Auth: `pln_` API token **or** Supabase JWT (JWKS).
- In-memory rate limits retained.
- `/.well-known/oauth-protected-resource` for connector discovery.

### Core (`packages/core`)

- `InsightsService` — tracker analytics.
- `AccountService` — wipe user app data + storage files.

## 3. Files Changed (high signal)

```
apps/web/middleware.ts
apps/web/lib/supabase/*, lib/session.ts
apps/web/app/actions/{auth,resumes,jobs,tokens,tracking,account}.ts
apps/web/app/(auth)/{page,resumes,jobs,tracker,settings}/**
apps/web/app/(unauth)/{login,signup}/**
apps/web/components/{app-shell,app-sidebar,login-form,token-create-form,score-badge}.*
apps/mcp/src/{index,auth,jwt-auth}.ts
apps/mcp/src/mcp/tools.ts          # all tools
packages/core/src/services/{insights,account}.ts
context/all-phases.md
```

## 4. Data Flow

```
Browser
  → Next.js server actions / RSC
  → @supabase/ssr (user JWT, RLS)
  → @passline/core services (also filter user_id)

MCP client
  → Bearer pln_… or Supabase JWT
  → Hono /mcp
  → service-role Supabase via core services (user_id required)
```

## 5. Important Decisions

- Web uses **user-scoped** Supabase client (RLS); MCP uses **service role** through the same services.
- Token minting is web-only; raw token never stored.
- OAuth consent is documented/scaffolded, not a full OIDC provider UI (Supabase project config required).
- Phase 6 billing/server LLM explicitly out of scope.
- Empty `job_url` coerced to `null` to satisfy Zod URL schema.
- Bulk prompt includes per-job JD array + instruction to call `save_ats_result` per job.

## 6. Validation

| Check | Result |
|---|---|
| `@passline/core` typecheck | Passed |
| `mcp` typecheck | Passed |
| `web` typecheck | Passed |
| Live Supabase E2E (auth/upload/MCP) | **Not run** — no project credentials in this environment |
| `next build` | **Not run** — typecheck only |
| MCP Inspector | **Not run** — needs env + token |

## 7. Remaining Work

- Apply SQL migrations to a real Supabase project; create Storage bucket via migration.
- Configure env (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`).
- Confirm email / disable confirm for local signup as needed.
- Full OAuth 2.1 consent screen when Supabase OAuth provider is enabled.
- Phase 6 later: server-side scoring, plan/usage billing tables.
- Pre-existing shadcn lint issues in unused dashboard chart components may still fail `web lint`.

## 8. Future Agent Guidance

**Start here:** `plan.md`, `context/phase-0-setup.md`, `context/phase-2-mcp-v1.md`, this file.

**Invariants:** one active resume; never store raw API tokens; MCP always filters `user_id`; web never ships service role key; bulk max 5.

**Pitfalls:** middleware redirects unauthenticated users to `/login` — keep `/auth/callback` public; signed URLs need `original_file_url` path under `{user_id}/`; form server actions that `redirect()` must not be used as client actions expecting return values (except `createTokenAction`).
