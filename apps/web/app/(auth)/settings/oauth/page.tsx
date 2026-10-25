import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireUser } from "@/lib/session"
import { toNavUser } from "@/lib/user-display"
import { Fragment } from "react/jsx-runtime"

/**
 * Phase 5 polish: OAuth consent / connector guidance.
 * Full Supabase OAuth 2.1 provider wiring depends on project config;
 * personal API tokens remain the primary MCP auth path.
 */
export default async function OAuthSettingsPage() {
  const { user } = await requireUser()
  const mcpBase =
    process.env.NEXT_PUBLIC_MCP_URL?.replace(/\/$/, "") ||
    "http://localhost:8001"

  return (
    <Fragment>
      <Button variant="outline" size="sm" render={<Link href="/settings" />}>
        ← Tokens
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connector sign-in (preview)</CardTitle>
          <CardDescription>
            Claude/ChatGPT connectors can use Supabase as an OAuth 2.1 / OIDC provider later.
            Today, create a personal API token on the Settings page and paste it into your MCP client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Protected resource metadata (for client discovery):
          </p>
          <code className="block break-all rounded-lg border bg-muted/40 p-3 text-xs">
            {mcpBase}/.well-known/oauth-protected-resource
          </code>
          <p className="text-muted-foreground">
            The MCP server also accepts a Supabase access JWT as{" "}
            <code>Authorization: Bearer &lt;jwt&gt;</code> when JWKS verification succeeds.
          </p>
        </CardContent>
      </Card>
    </Fragment>
  )
}
