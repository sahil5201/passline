# ATS Resume Checker: Web App + MCP Server

**Status:** Planning (v2, decisions incorporated)

## 0. Decisions Made

| Question | Decision |
|---|---|
| Resume versions | Multiple versions allowed. User marks one as **active**; MCP fetches the active one by default (or a specific version on request). |
| Who runs scoring | **MCP only** for now. The user's AI tool does the analysis; the server stores results. No server-side LLM calls. |
| Pricing | **Free for now.** Basic abuse limits only; billing/usage tiers planned for later. |
| Stack | Next.js, Supabase (Postgres, Storage, Auth), official TypeScript MCP SDK with Streamable HTTP, served by Hono on Bun. |

---

## 1. Architecture

```
Web App (Next.js) ───────┐
                         ├── packages/core (shared logic) ── Supabase
MCP Server (Hono + Bun) ─┘                                   ├─ Postgres
                                                             ├─ Storage (S3-compatible)
                                                             └─ Auth
```

- **One shared backend.** The web app and MCP server use the same Supabase project and the same shared code, so a JD saved on the web is instantly visible to MCP.

### Chosen stack

| Layer | Choice |
|---|---|
| Web app | Next.js (App Router) + `@supabase/ssr` |
| MCP server | Official TypeScript MCP SDK (`@modelcontextprotocol/sdk`), Streamable HTTP transport, served by **Hono on Bun** |
| Database | Supabase Postgres (migrations via Supabase CLI) |
| File storage | Supabase Storage (S3-compatible), private bucket |
| Auth | Supabase Auth (web login + MCP token/OAuth validation) |
| Validation | Zod (shared schemas for tools, results, and forms) |

### Repo layout

```
apps/
  web/            Next.js + shadcn/ui app
  mcp/            Hono + MCP server
packages/
  core/           services (resumes, jobs, results), Zod schemas,
                  ATS rubric + prompt, text extraction
  db/             generated Supabase types, SQL migrations
```

Both apps import `packages/core`, so rules like "only one active resume" or "bulk max 5" live in one place.

### Deployment

- **Next.js:** Vercel (or any Node host).
- **MCP server:** a persistent Bun container (Fly.io, Railway, Render). Vercel is not a good fit for Bun/Hono here.
- Put the MCP server on its own subdomain, e.g. `mcp.yourapp.com/mcp`.

## 2. Analysis Model: User's AI Does the Work

The MCP tool returns the resume, the JD, the ATS-refinement skill/prompt, and a required output schema. The user's AI tool (Claude, ChatGPT, etc.) runs the analysis, shows the result in chat, then calls `save_ats_result`.

**Why:** zero LLM cost for you, users get their own model's quality, and it fits the free launch.

**Trade-off:** results vary by model. Mitigations:
- Strict JSON output schema, validated on save.
- Versioned rubric (`rubric_version` stored with each result).
- Store `model_used` when the client provides it.

**Future option:** add a server-side "Check score" button in the web app later, reusing the same rubric and schema so scores stay comparable. Out of scope for now.

## 3. Resume Storage and Versions

**Store both the original file and extracted text; serve text by default.**

- On upload, save the original (PDF/DOC/DOCX/MD/TXT) to a **private Supabase Storage bucket** (`resumes`) at `{user_id}/{resume_id}/original.{ext}`, and extract clean Markdown/text (pdf-parse/unpdf, mammoth for DOCX) in `packages/core`. Pasted text is stored directly.
- Storage policies restrict each user to their own `{user_id}/` folder. Downloads always use short-lived signed URLs.
- Legacy `.doc` is the weakest format to parse; consider accepting it with a "convert to DOCX or PDF if text looks wrong" hint.
- Users can upload **multiple versions**, each with a label (e.g. "Backend 2026", "Product Manager") and optional notes.
- **Exactly one version is active** at a time. Setting a new active version unsets the previous one.
- Web preview of extracted text lets users fix parsing errors, which also matters for real ATS compatibility.
- MCP `get_resume` returns **Markdown text** by default (small, LLM-friendly, avoids binary handling issues across clients).
- Optional `format: "original"` returns a short-lived signed URL.
- Optional `resume_id` fetches a non-active version.
- Each ATS result records which `resume_id` it was run against, so users can compare versions.

## 4. Data Model

- **auth.users**: managed by Supabase Auth (no custom users table needed; add a `profiles` table only if you need extra fields). All `user_id` columns reference `auth.users(id)` with `on delete cascade`, which also powers "delete my account and data".
- **Row Level Security (RLS)** enabled on every table with `user_id = auth.uid()` policies, so the web app is safe even when it queries from the browser.
- **resumes**: id, user_id, label, original_file_url, file_type, extracted_text, is_active, version_number, notes, created_at, updated_at
  - Constraint: one `is_active = true` per user (partial unique index).
- **jobs**: id, user_id, title, company (opt), job_url (opt), date_added, date_applied (opt), jd_text, role/industry (opt), `status` (`saved | queued | analyzed`), notes
- **ats_results**: id, job_id, resume_id, score, matched_keywords, missing_keywords, section_feedback, formatting_issues, suggested_changes, rubric_version, model_used, created_at
- **application_tracking**: job_id, `applied_with_ats_changes` (bool, nullable), `heard_back` (`none | no_response | interview | offer | rejected`), updated_at
- **api_tokens**: id, user_id, name, token_hash (SHA-256, never store the raw token), prefix (for display), last_used_at, revoked_at, created_at

## 5. Web App Features

1. **Auth:** sign up/login, plus an API token management page for MCP.
2. **Resumes:**
   - Upload (PDF/DOC/DOCX/MD/TXT) or paste text.
   - Multiple versions with labels; one-click "Set as active"; delete/rename.
   - Extracted-text preview and edit.
3. **Jobs:**
   - Add JD with optional company, date, role/industry, URL.
   - Score badge (from the latest saved result).
   - **"Queue for ATS check"** toggle that marks the job for bulk MCP runs.
4. **ATS result view:** score, missing keywords, suggested edits, which resume version was used. Results come from MCP; the web app displays them only.
5. **Post-result survey** (two small questions, editable later):
   - "Did you apply with the ATS changes?" (yes/no)
   - "Did you hear back?" (no response / interview / offer / rejected)
6. **Application tracker dashboard:** table/kanban filtered by status, with insights such as response rate for ATS-optimized vs. non-optimized applications and score by resume version.

## 6. MCP Server Tools

| Tool | Purpose |
|---|---|
| `list_resumes` | Lists the user's resume versions (id, label, active flag, updated date) |
| `get_resume` | Returns the active resume as text by default; optional `resume_id` and `format: "original"` (signed URL) |
| `set_active_resume` (optional) | Switch the active version from chat |
| `check_ats_compatibility` | Takes `jd_text` or `job_id`, optional `role`/`industry`, optional `resume_id`. Returns resume + JD + ATS-refinement prompt + required output schema |
| `save_ats_result` | Saves the AI-generated result against a job (creates the job if only raw JD text was given); validates against schema |
| `list_pending_jobs` | Lists jobs with status `queued` |
| `run_bulk_ats_check` | Returns up to **5** queued jobs with the active resume and prompt. The AI analyzes each and saves via `save_ats_result` |
| `update_application_status` (optional) | Mark applied / heard back from chat |

### Single-check flow
1. Check user resume (active, or specified)
2. Check JD (pasted text or saved `job_id`)
3. Check specific role/industry (optional)
4. Load/run the ATS-refinement skill and prompt
5. Show result in chat and save via `save_ats_result`

### Bulk flow
1. In the web app, user adds JDs and toggles "Queue for ATS check".
2. In chat, user runs `run_bulk_ats_check` (or calls `list_pending_jobs` first).
3. Server returns max 5 queued jobs plus the active resume and prompt, and a `remaining_count`.
4. The AI analyzes each job and calls `save_ats_result` for each; status flips to `analyzed`.
5. If `remaining_count > 0`, the AI tells the user to run it again.

### MCP server implementation (Hono + Bun)

- Single route `POST/GET /mcp` using the SDK's Streamable HTTP transport (Hono-compatible via the SDK's web-standard transport or the `@hono/mcp` adapter; confirm the exact package against current docs when you start).
- **Stateless mode:** create a fresh `McpServer` + transport per request. Simpler to scale and restart, and none of the planned tools need server-side sessions.
- Hono middleware runs before MCP handling: authenticate, resolve `user_id`, apply rate limits, then pass `user_id` into the tool handlers.
- Tool inputs/outputs are defined with the shared Zod schemas from `packages/core`.

### MCP auth (with Supabase Auth)

Two ways in, both resolving to a `user_id`:

1. **Personal API token (build first, simplest).** The user creates a token on the web app's settings page, shown once, stored hashed. The AI client sends it as `Authorization: Bearer <token>`. Hono middleware hashes it, looks it up, rejects revoked tokens, and updates `last_used_at`.
2. **OAuth 2.1 (build later).** Supabase Auth can act as an OAuth 2.1 / OIDC provider so Claude/ChatGPT connectors can sign users in without pasting tokens. Check the feature's current status in Supabase docs before committing. The MCP server then validates the Supabase-issued JWT (verify signature via the project's JWKS, check audience and expiry). You'll also need to expose the OAuth protected-resource metadata endpoint that MCP clients look for, and a consent screen page in the Next.js app.

**Data access rule:** the MCP server connects with the Supabase **service role** (bypasses RLS), so it must **never** run a query without a `user_id` filter. Enforce this in one repository layer inside `packages/core` rather than in each tool. Keep the service role key server-side only, never in the Next.js client bundle.

## 7. ATS Scoring Rubric (Shared, Versioned)

| Category | Weight |
|---|---|
| Keyword/skills match | 35% |
| Job title and experience alignment | 20% |
| Formatting and parseability (no tables/columns/graphics, standard headings) | 20% |
| Section completeness and quantified impact | 15% |
| Role/industry-specific fit | 10% |

- Output is strict JSON: score, matched, missing, issues, suggested rewrites, rubric_version.
- **Honesty rule:** the AI must never fabricate experience; only reword or reorder what is truthful.

## 8. Free-Tier Limits (Abuse Protection Only)

No billing now, but cap to protect the service:
- Max resume file size (e.g. 5 MB) and max resume versions per user (e.g. 10).
- Max JD length (e.g. 15k characters).
- Rate limit on MCP calls per user per minute/day.
- Bulk run capped at 5 JDs per call.
- Design the schema so a `plan`/`usage` table can be added later without migration pain.

## 9. Build Phases

0. **Setup:** Bun workspaces monorepo, Supabase project (CLI migrations, RLS policies, private `resumes` bucket), shared `packages/core` with Zod schemas.
1. **MVP:** Supabase Auth login in Next.js, resume upload with text extraction and multi-version/active logic, job CRUD.
2. **MCP v1:** Hono + Bun server with API-token auth, `list_resumes`, `get_resume`, `check_ats_compatibility`, `save_ats_result`. Test with MCP Inspector, then Claude.
3. **Tracking:** results page, survey, tracker dashboard.
4. **Bulk:** queue flag, `list_pending_jobs`, `run_bulk_ats_check`.
5. **Polish:** OAuth, rate limits, analytics, version-comparison insights.
6. **Later:** optional server-side scoring, usage limits/billing.

## 10. Risks and Notes

- **Privacy:** resumes contain PII. Encrypt at rest, offer delete-my-data (including all versions and files), and state clearly what is stored.
- **Parsing quality:** PDF extraction can be messy, so allow editing of extracted text.
- **Score consistency:** fixed schema, versioned rubric, stored `model_used`. Scores from different AI models may not be directly comparable; show the model alongside the score.
- **Prompt injection:** JD and resume text are untrusted input passed to the user's AI. Wrap them in clearly delimited data blocks and instruct the model to treat them as data only.
- **Abuse:** enforce the limits in section 8.
- **Service role key:** it bypasses RLS. Keep it only in the MCP server and Next.js server code, and route all MCP queries through the `user_id`-scoped repository layer.
- **Rate limiting on Bun:** in-memory limits reset on restart and don't work across multiple instances. Start simple, then move counters to Postgres or Redis if you scale out.
- **Supabase free-tier limits:** projects can pause when inactive, and storage/database size is capped. Fine for development, but check before launch.

## 11. Next Steps

- Draft exact MCP tool schemas (inputs/outputs).
- Write the ATS-refinement prompt and JSON output schema.
- Design the DB migrations and wireframes for the resume and job pages.
