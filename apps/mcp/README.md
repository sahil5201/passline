# Passline MCP server

Hono + Bun MCP (Streamable HTTP).

## Tools

- `list_resumes`, `get_resume`, `set_active_resume`
- `check_ats_compatibility`, `save_ats_result`
- `list_pending_jobs`, `run_bulk_ats_check`
- `update_application_status`

## Auth

1. **API token (primary):** `Authorization: Bearer pln_…`
2. **Supabase JWT:** Bearer access token verified via JWKS

Discovery: `GET /.well-known/oauth-protected-resource`

## Run

```bash
bun run dev
```

- `GET /health`
- `POST/GET /mcp` (auth required)

```bash
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:8001/mcp` with your Bearer token.
