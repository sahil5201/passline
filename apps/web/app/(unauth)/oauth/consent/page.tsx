// app/oauth/consent/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, ShieldAlert, Check, X, LockKeyhole } from "lucide-react";



export default async function ConsentPage({
    searchParams,
}: {
    searchParams: { authorization_id?: string }
}) {
    const authorizationId = (await searchParams).authorization_id

    if (!authorizationId) {
        return <div>Error: Missing authorization_id</div>
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll: async () => (await cookies()).getAll(),
                setAll: async (cookiesToSet, _headers) => {
                    const cookieStore = await cookies()
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                },
            },
        }
    )

    // Check if user is authenticated
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims

    if (!claims) {
        const params = new URLSearchParams({
            authorization_id: authorizationId,
            next: `/oauth/consent?authorization_id=${authorizationId}`,
        })

        redirect(`/login?${params.toString()}`)
    }

    // Get authorization details using the authorization_id
    const { data: authDetails, error } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

    if (error || !authDetails) {
        return <div>Error: {error?.message || 'Invalid authorization request'}</div>
    }

    // if no authorization_id returned, user has previously consented, redirect them
    if (!('authorization_id' in authDetails)) {
        redirect(authDetails['redirect_url'])
    }

    const scopes = authDetails.scope?.trim()
        ? authDetails.scope.trim().split(/\s+/)
        : [];

return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border/60 shadow-xl shadow-black/5">
        <CardHeader className="space-y-4 pb-6 pt-8 text-center">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Authorize {authDetails.client.name}
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-sm leading-6">
              This application wants permission to access your account.
              Review the details below before continuing.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-8 sm:px-8">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background">
                <LockKeyhole className="size-5 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="wrap-break-word font-medium">
                  {authDetails.client.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Third-party application
                </p>
              </div>

              <Badge variant="outline" className="shrink-0 gap-1">
                <ShieldCheck className="size-3" />
                OAuth
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Client
                </p>
                <p className="break-words text-sm font-medium">
                  {authDetails.client.name}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Redirect URI
                </p>
                <code className="block break-all rounded-md bg-muted px-2.5 py-2 text-xs leading-5">
                  {authDetails.redirect_uri}
                </code>
              </div>
            </div>
          </div>

          {scopes.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">
                  Requested permissions
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Review what this application will be allowed to access.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {scopes.map((scopeItem) => (
                  <Badge
                    key={scopeItem}
                    variant="secondary"
                    className="rounded-md px-2.5 py-1 font-mono text-xs"
                  >
                    {scopeItem}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-5 text-muted-foreground">
              Only approve if you trust this application and recognize
              the requested permissions.
            </p>
          </div>

          <form
            action="/api/oauth/decision"
            method="POST"
            className="space-y-3"
          >
            <input
              type="hidden"
              name="authorization_id"
              value={authorizationId}
            />

            <Button
              type="submit"
              name="decision"
              value="approve"
              className="h-11 w-full gap-2 font-medium"
            >
              <Check className="size-4" />
              Approve access
            </Button>

            <Button
              type="submit"
              name="decision"
              value="deny"
              variant="outline"
              className="h-11 w-full gap-2 font-medium text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
              Deny access
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Your account security matters. You can deny this request if
            anything looks unfamiliar.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}