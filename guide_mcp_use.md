# Passline — MCP usage guide

How to connect Passline to AI tools (Claude, ChatGPT, Cursor, MCP Inspector) and run ATS checks from chat.

## What Passline MCP does

Passline does **not** call an LLM on the server. Your AI tool:

1. Fetches your resume + job description + ATS rubric/prompt via MCP tools  
2. Analyzes them with **its own model**  
3. Saves the structured result back with `save_ats_result`  

Scores then show up in the Passline web app (Jobs / Tracker).

```
You ↔ Claude / ChatGPT / Cursor
        ↕ MCP (HTTP)
   Passline MCP server (/mcp)
        ↕
   Supabase (your resumes, jobs, results)
```

---

## 1. Prerequisites

1. **Supabase project** set up and migrations applied — see `guide_supabase.md`  
2. **Web app** running with Auth configured  
3. **MCP server** running with service role key  
4. At least one **resume** uploaded (set as active)  
5. A **personal API token** (`pln_…`) from Settings  

### Start the MCP server

From the repo:

```bash
# env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see .env.example)
bun run dev:mcp
# → http://localhost:8001
```

Health check (no auth):

```bash
curl http://localhost:8001/health
```

MCP endpoint (auth required):

```text
http://localhost:8001/mcp
```

For Claude/ChatGPT in the cloud, localhost will not work — deploy the MCP server (Fly, Railway, Render, etc.) and use `https://mcp.yourdomain.com/mcp`.

---

## 2. Create an API token

1. Sign in to the Passline web app  
2. Open **Settings**  
3. Under **MCP API tokens**, enter a name (e.g. `Claude desktop`) → **Create token**  
4. **Copy the token immediately** — it is shown once  

Format:

```text
pln_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Clients must send:

```http
Authorization: Bearer pln_…
```

Revoke or delete unused tokens from the same Settings page.

---

## 3. Connect your AI tool

### A. MCP Inspector (best for testing)

```bash
npx @modelcontextprotocol/inspector
```

1. Transport: **Streamable HTTP** (or HTTP)  
2. URL: `http://localhost:8001/mcp`  
3. Headers: `Authorization` = `Bearer pln_YOUR_TOKEN`  
4. Connect → list tools → try `list_resumes`  

---

### B. Claude Desktop

1. Open Claude Desktop → **Settings → Developer → Edit Config**  
2. Edit `claude_desktop_config.json` (path varies by OS):

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

3. Add a server entry (Streamable HTTP + header). Exact keys depend on your Claude Desktop version; common shapes:

```json
{
  "mcpServers": {
    "passline": {
      "url": "http://localhost:8001/mcp",
      "headers": {
        "Authorization": "Bearer pln_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

If your build expects an explicit type:

```json
{
  "mcpServers": {
    "passline": {
      "type": "http",
      "url": "http://localhost:8001/mcp",
      "headers": {
        "Authorization": "Bearer pln_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

4. Fully quit and restart Claude Desktop  
5. Confirm **passline** tools appear (hammer / MCP icon)  
6. Try: “List my Passline resumes.”

**Remote / production:** replace the URL with your public MCP URL, e.g. `https://mcp.yourapp.com/mcp`.

---

### C. Claude.ai (custom connectors)

1. Deploy Passline MCP to a public HTTPS URL  
2. In Claude.ai, add a **custom connector** / remote MCP pointing at:

```text
https://mcp.yourdomain.com/mcp
```

3. Auth today: **Bearer API token** (paste `pln_…` where the connector asks for a header or secret)  
4. OAuth sign-in via Supabase is **scaffolded** (see `/.well-known/oauth-protected-resource`) but the primary path is still the personal API token  

If the UI only supports OAuth connectors, use Claude Desktop or Cursor with the token header until OAuth consent is fully enabled for your project.

---

### D. ChatGPT

ChatGPT’s MCP / connector support is evolving. Practical options:

1. **Custom GPT / Actions** — only if you wrap Passline in OpenAPI; Passline’s native interface is MCP, not REST CRUD for all tools  
2. **MCP-compatible ChatGPT surfaces** (when available) — use the same Streamable HTTP URL + `Authorization: Bearer pln_…`  
3. **Until native MCP is available in your ChatGPT plan:** use Claude Desktop, Cursor, or MCP Inspector with Passline  

When ChatGPT asks for a server URL:

```text
https://mcp.yourdomain.com/mcp
```

Header:

```text
Authorization: Bearer pln_YOUR_TOKEN
```

---

### E. Cursor

1. Open **Cursor Settings → MCP** (or edit `.cursor/mcp.json` / user MCP config)  
2. Add:

```json
{
  "mcpServers": {
    "passline": {
      "url": "http://localhost:8001/mcp",
      "headers": {
        "Authorization": "Bearer pln_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

3. Reload MCP / restart Cursor  
4. In Agent chat, ask it to use Passline tools (e.g. “Use Passline to check this JD against my active resume”).

---

## 4. Typical workflows

### Single job check

**In the web app (optional):** add the job under **Jobs** (copy its id), or skip and paste the JD in chat.

**In your AI tool, say something like:**

> Using Passline, check my active resume against this job description. Then save the result.
>
> ```
> [paste JD]
> ```

**What the model should do:**

1. `get_resume` (or `list_resumes` first)  
2. `check_ats_compatibility` with `jd_text` **or** `job_id`  
3. Analyze using the returned `ats_prompt` + `required_output_schema`  
4. Show you a short summary in chat  
5. `save_ats_result` with the JSON result (and `job_id` if you had one)  

Then open the job in the web app to see score, missing keywords, and suggested edits.

---

### Bulk check (queued jobs)

1. In the web app, add several jobs and toggle **Queue for ATS check**  
2. In chat:

> Run Passline `run_bulk_ats_check`. Analyze each returned job and call `save_ats_result` for each. If `remaining_count` > 0, tell me to run it again.

3. Max **5** jobs per call; repeat until the queue is clear  

You can preview the queue with `list_pending_jobs`.

---

### Switch resume version

> List my Passline resumes and set “Backend 2026” as active.

Uses `list_resumes` + `set_active_resume`.

---

### Update application survey from chat

> For job `<job_id>`, I applied with the ATS changes and got an interview. Update Passline.

Uses `update_application_status` with `applied_with_ats_changes` and `heard_back`.

---

## 5. Tool reference

| Tool | Purpose |
|---|---|
| `list_resumes` | List versions (id, label, active, updated) |
| `get_resume` | Active resume as text (default); optional `resume_id`; `format: "original"` → signed URL |
| `set_active_resume` | Switch active version |
| `check_ats_compatibility` | Resume + JD + ATS prompt + JSON schema (`jd_text` or `job_id`) |
| `save_ats_result` | Validate & store analysis; creates job if only `jd_text` given |
| `list_pending_jobs` | Jobs with status `queued` |
| `run_bulk_ats_check` | Up to 5 queued jobs + resume + prompt + `remaining_count` |
| `update_application_status` | Survey: applied with ATS changes? / heard back? |

### `check_ats_compatibility` inputs

| Field | Required | Notes |
|---|---|---|
| `jd_text` | one of | Raw job description (max 15k chars) |
| `job_id` | one of | Saved job from the web app |
| `resume_id` | no | Defaults to active resume |
| `role` / `industry` | no | Improves role/industry scoring |

### `save_ats_result` inputs

| Field | Required | Notes |
|---|---|---|
| `result` | yes | Strict JSON: score, matched/missing keywords, section_feedback, formatting_issues, suggested_changes, rubric_version, optional model_used |
| `job_id` | one of | Existing job |
| `jd_text` | one of | Creates a job if no `job_id` |
| `resume_id` | no | Defaults to active |
| `title` / `company` / `role` / `industry` | no | Used when creating from `jd_text` |

**Honesty rule:** the model must not invent experience — only reword/reorder what is already in the resume. The prompt returned by Passline states this explicitly.

---

## 6. Example prompts

**Quick check**

> Check my Passline resume against this JD and save the ATS result:  
> Senior Backend Engineer at Acme… [paste]

**Saved job**

> Run Passline ATS check for job_id `YOUR-UUID` and save the result. Show missing keywords and top 3 suggested rewrites.

**Bulk**

> Call `list_pending_jobs`, then `run_bulk_ats_check`. Score each job, save each result, and report scores in a table.

**Compare versions**

> List resumes, set “Product Manager” active, check against this JD, then set “Backend 2026” active and check again. Compare scores.

---

## 7. Security & limits

- Treat `pln_…` like a password. Do not commit it or paste it into public chats.  
- Revoke tokens in **Settings** if leaked.  
- MCP rate limits (per user, in-memory): **60/minute**, **1000/day** (abuse protection).  
- Resume file max **5 MB**; max **10** resume versions; JD max **15k** characters; bulk max **5** jobs.  
- The MCP server uses the Supabase **service role** but always scopes data to your user id from the token.  

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| 401 Unauthorized | Wrong/missing `Bearer` token; create a new token; ensure it starts with `pln_` |
| 429 Rate limit | Wait and retry; reduce bulk frequency |
| 500 misconfigured | MCP missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` |
| No tools in Claude | Restart app; check JSON config; confirm URL reaches `/mcp` |
| `NO_ACTIVE_RESUME` | Upload a resume in the web app and set it active |
| Empty `list_pending_jobs` | Toggle **Queue for ATS** on jobs in the web app |
| Cloud Claude can’t reach localhost | Deploy MCP publicly (HTTPS) |
| `save_ats_result` validation error | Result must match `required_output_schema` from `check_ats_compatibility`; include correct `rubric_version` |
| Original file signed URL fails | Paste-only resumes have no file — use `format: "text"` |

Verify the server:

```bash
curl http://localhost:8001/health
curl -i http://localhost:8001/mcp \
  -H "Authorization: Bearer pln_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream"
```

---

## 9. Related docs

| Doc | Topic |
|---|---|
| `guide_supabase.md` | Migrations, env, types sync |
| `apps/mcp/README.md` | Server run / Inspector |
| `plan.md` §6 | Tool design and flows |
| `context/phase-2-mcp-v1.md` | MCP implementation notes |
| Web **Settings → OAuth** | Connector / JWT discovery notes |

---

## Quick start checklist

- [ ] Migrations applied (`guide_supabase.md`)  
- [ ] Web + MCP env vars set  
- [ ] `bun run dev:web` and `bun run dev:mcp`  
- [ ] Sign up, upload resume, set active  
- [ ] Create `pln_` token in Settings  
- [ ] Add Passline to Claude / Cursor / Inspector with Bearer header  
- [ ] Ask: “List my Passline resumes”  
- [ ] Paste a JD and ask for an ATS check + save  
