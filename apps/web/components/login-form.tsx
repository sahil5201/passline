import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/app/actions/auth"

export function LoginForm({
  className,
  next = "/",
  error,
  message,
  ...props
}: React.ComponentProps<"div"> & {
  next?: string
  error?: string
  message?: string
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Passline</CardTitle>
          <CardDescription>
            Manage resumes, jobs, and MCP API tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {message ? (
            <p className="mb-4 text-sm text-muted-foreground">{message}</p>
          ) : null}
          <form action={signIn}>
            <input type="hidden" name="next" value={next} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </Field>
              <Field>
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
                {/* <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline-offset-4 hover:underline">
                    Sign up
                  </Link>
                </FieldDescription> */}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
