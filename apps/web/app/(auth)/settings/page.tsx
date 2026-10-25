import Link from "next/link"
import { TokenService } from "@passline/core"
import {
  createTokenAction,
  deleteTokenAction,
  revokeTokenAction,
} from "@/app/actions/tokens"
import { deleteMyDataAction } from "@/app/actions/account"
import { TokenCreateForm } from "@/components/token-create-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireUser } from "@/lib/session"
import { Fragment } from "react/jsx-runtime"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { supabase, user } = await requireUser()
  const tokens = await new TokenService(supabase, user.id).list()

  return (
    <Fragment>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">MCP API tokens</CardTitle>
          <CardDescription>
            Create a personal token for Claude, ChatGPT, or MCP Inspector. The raw token is shown once.
            Send it as <code>Authorization: Bearer pln_…</code>.{" "}
            <Link href="/settings/oauth" className="underline-offset-4 hover:underline">
              OAuth / connector notes
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TokenCreateForm action={createTokenAction} />

          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No tokens yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell>
                        <code className="text-xs">{token.prefix}…</code>
                      </TableCell>
                      <TableCell>
                        {new Date(token.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {token.last_used_at
                          ? new Date(token.last_used_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {token.revoked_at ? (
                          <Badge variant="outline">Revoked</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {!token.revoked_at ? (
                          <form action={revokeTokenAction} className="inline">
                            <input type="hidden" name="id" value={token.id} />
                            <Button type="submit" size="xs" variant="outline">
                              Revoke
                            </Button>
                          </form>
                        ) : null}
                        <form action={deleteTokenAction} className="inline">
                          <input type="hidden" name="id" value={token.id} />
                          <Button type="submit" size="xs" variant="destructive">
                            Delete
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
          <CardDescription>
            Deletes all resumes, jobs, results, tracking, tokens, and stored files for your account,
            then signs you out. Auth account removal may still be needed in Supabase dashboard if email
            confirmation is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteMyDataAction}>
            <Button type="submit" variant="destructive">
              Delete my data
            </Button>
          </form>
        </CardContent>
      </Card>
    </Fragment>
  )
}
