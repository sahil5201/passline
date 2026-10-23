# Passline — Supabase guide

How to run database migrations and keep this repo in sync with Supabase (local + hosted).

## Layout in this repo

```
packages/db/
  supabase/
    config.toml                 # CLI config (project_id = passline)
    migrations/
      20260310000001_initial_schema.sql
      20260310000002_storage_resumes.sql
  src/
    database.types.ts           # TypeScript Database types (keep in sync with schema)
    index.ts
```

All CLI commands below use `--workdir packages/db` so they pick up that `supabase/` folder.

---

## 1. Install the Supabase CLI

**Windows (Scoop):**

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS (Homebrew):**

```bash
brew install supabase/tap/supabase
```

**npm (any OS):**

```bash
npm install -g supabase
```

Also install **Docker Desktop** if you want a local Supabase stack (`supabase start`). Remote-only workflows (`db push`) do not need Docker.

Check:

```bash
supabase --version
```

---

## 2. First-time setup

### A. Create a hosted project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a project
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (server only — never put this in the browser)

### B. Put keys in env files

**Web** — `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MCP_URL=http://localhost:8001
```

**MCP** — `apps/mcp/.env` (or root `.env`):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MCP_PORT=8001
```

See also root `.env.example`.

### C. Link the CLI to your project

From the **repo root**:

```bash
supabase login
supabase --workdir packages/db link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the subdomain part of `https://YOUR_PROJECT_REF.supabase.co` (also shown in Project Settings → General).

---

## 3. Run migrations (apply schema)

### Option A — Push to hosted Supabase (most common)

Applies every file in `packages/db/supabase/migrations/` that has not been applied yet:

```bash
supabase --workdir packages/db db push
```

This is what you want for staging/production after linking.

### Option B — Local Supabase (Docker)

```bash
supabase --workdir packages/db start
supabase --workdir packages/db db reset
```

- `start` — runs API, DB, Studio, Storage locally  
- `db reset` — wipes local DB and re-applies all migrations from scratch  

Local URLs (from this repo’s `config.toml`):

| Service | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

Use local keys printed by `supabase status`:

```bash
supabase --workdir packages/db status
```

### What the migrations create

1. **`20260310000001_initial_schema.sql`** — `resumes`, `jobs`, `ats_results`, `application_tracking`, `api_tokens` + RLS + indexes  
2. **`20260310000002_storage_resumes.sql`** — private `resumes` storage bucket + storage RLS  

After `db push` / `db reset`, Auth (`auth.users`) is already provided by Supabase; our tables reference it with `ON DELETE CASCADE`.

---

## 4. Add a new migration (schema change)

**Do not edit old migration files** after they have been applied to shared/remote environments. Always add a new file.

### Recommended: CLI-generated timestamp

```bash
supabase --workdir packages/db migration new add_something
```

This creates e.g. `packages/db/supabase/migrations/20260310123000_add_something.sql`. Write your SQL there.

### Manual

Create a new file named:

```text
YYYYMMDDHHMMSS_short_description.sql
```

Example: `20260315101500_add_jobs_priority.sql`

### Then apply

```bash
# remote
supabase --workdir packages/db db push

# or local
supabase --workdir packages/db db reset
```

Prefer `db push` for remote (incremental). Prefer `db reset` only for local (destructive).

---

## 5. Keep TypeScript types in sync

After any schema change, regenerate `packages/db/src/database.types.ts`.

### From local DB

```bash
supabase --workdir packages/db gen types typescript --local > packages/db/src/database.types.ts
```

### From linked remote project

```bash
supabase --workdir packages/db gen types typescript --linked > packages/db/src/database.types.ts
```

### From a project ref without relying on link

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > packages/db/src/database.types.ts
```

Then typecheck:

```bash
bun run --filter @passline/db typecheck
bun run --filter @passline/core typecheck
```

`@passline/core` and the apps import these types. If you skip codegen, hand-edit `database.types.ts` to match — but codegen is the source of truth once CLI is set up.

---

## 6. Sync workflows (day to day)

### You changed SQL in the repo → update Supabase

```bash
# 1. Write new migration under packages/db/supabase/migrations/
supabase --workdir packages/db migration new my_change

# 2. Edit the new .sql file

# 3. Apply
supabase --workdir packages/db db push          # remote
# or
supabase --workdir packages/db db reset         # local only

# 4. Regenerate types
supabase --workdir packages/db gen types typescript --linked > packages/db/src/database.types.ts
```

### Someone else changed the remote DB in the dashboard → pull into repo

Avoid editing production schema only in the Dashboard if you can. If you must:

```bash
# Diff remote schema vs local migrations (review carefully)
supabase --workdir packages/db db pull
```

`db pull` can create a migration that mirrors remote drift. Review the generated SQL, commit it, then regenerate types.

If the Dashboard change was experimental, prefer recreating it as a proper migration file instead of relying on pull.

### Check migration status

```bash
supabase --workdir packages/db migration list
```

Shows which migrations exist locally vs which are applied on the linked remote.

### Repair history (if remote history is wrong)

Only when the CLI reports migration history mismatches:

```bash
supabase --workdir packages/db migration repair --status applied MIGRATION_VERSION
# or
supabase --workdir packages/db migration repair --status reverted MIGRATION_VERSION
```

Use the version timestamp from the filename (e.g. `20260310000001`). Prefer fixing process so this is rare.

---

## 7. Seed / Auth notes for Passline

- **Sign up** in the web app uses Supabase Auth. For local dev you may disable “Confirm email” under **Authentication → Providers → Email**.
- **MCP tokens** are rows in `api_tokens` (created from **Settings** in the web app). The raw `pln_…` token is shown once; only the SHA-256 hash is stored.
- **Storage**: uploads go to bucket `resumes` at `{user_id}/{resume_id}/original.{ext}`. The second migration creates the bucket; if `db push` fails on storage, confirm the Storage API is enabled on the project.
- **Service role**: MCP and trusted server paths use `SUPABASE_SERVICE_ROLE_KEY`. It bypasses RLS — all MCP queries must still filter by `user_id` via `@passline/core` services.

---

## 8. Useful command cheat sheet

| Goal | Command |
|---|---|
| Link project | `supabase --workdir packages/db link --project-ref REF` |
| Apply migrations (remote) | `supabase --workdir packages/db db push` |
| Start local stack | `supabase --workdir packages/db start` |
| Reset local DB + migrations | `supabase --workdir packages/db db reset` |
| New migration file | `supabase --workdir packages/db migration new name` |
| List local vs remote | `supabase --workdir packages/db migration list` |
| Types from remote | `supabase --workdir packages/db gen types typescript --linked > packages/db/src/database.types.ts` |
| Types from local | `supabase --workdir packages/db gen types typescript --local > packages/db/src/database.types.ts` |
| Pull remote schema drift | `supabase --workdir packages/db db pull` |
| Stop local | `supabase --workdir packages/db stop` |

---

## 9. Recommended team habit

1. Schema changes **only** via new files in `packages/db/supabase/migrations/`.
2. `db push` on each environment after merge.
3. Always regenerate and commit `database.types.ts` in the same PR as the migration.
4. Never commit `service_role` keys; only `NEXT_PUBLIC_*` anon values belong in client env.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `supabase: command not found` | Install CLI (section 1) |
| Migrations not found | Run from repo root with `--workdir packages/db` |
| `db push` asks for password | Use DB password from Project Settings → Database, or link again |
| Types out of date | Re-run `gen types` (section 5) |
| RLS blocks web inserts | Confirm user is logged in; policies require `auth.uid() = user_id` |
| MCP works but web doesn’t (or reverse) | Check anon vs service role keys and which app env file you edited |
| Storage upload fails | Ensure migration `…000002_storage_resumes.sql` applied; bucket `resumes` exists |
| Local ports busy | Change ports in `packages/db/supabase/config.toml` or stop other stacks |

For product schema details, see `plan.md` §4 and `context/phase-0-setup.md`.
