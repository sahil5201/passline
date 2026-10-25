
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
import { Button } from "@/components/ui/button"
import { waitlist } from "@/app/actions/auth"
import { Metadata } from "next"
import { Check, CheckCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Join the waitlist",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}) {
  const params = await searchParams

  if (params.message) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden rounded-2xl border shadow-sm">
            <CardHeader className="space-y-3 pb-4 text-center">
              <div className="text-sm font-bold tracking-[0.3em] text-primary">
                PASSLINE
              </div>

              <CardTitle className="text-2xl font-semibold tracking-tight">
                Join the waitlist
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                You're on your way to something great.
              </p>
            </CardHeader>

            <CardContent className="space-y-5 pb-6">
              <div className="border-t" />

              <div className="flex flex-col items-center gap-4 py-3">
                <CheckCircle2 className="text-green-600 size-16" />

                <h3 className="text-lg font-semibold text-green-700">
                  You're on the list!
                </h3>

                <p
                  role="status"
                  className="text-center text-sm leading-relaxed text-green-600"
                >
                  {params.message}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Thanks for your interest in PASSLINE. Stay tuned for updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            {/* <div className="mb-2 text-sm font-semibold tracking-widest text-primary">
              PASSLINE
            </div> */}

            <CardTitle className="text-2xl">
              Join the waitlist
            </CardTitle>

            <CardDescription>
              Be among the first to experience Passline.
              Upload resumes, connect MCP, and get ready for launch.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {params.error && (
              <p
                role="alert"
                className="mb-4 text-sm text-destructive"
              >
                {params.error}
              </p>
            )}

            <form action={waitlist}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">
                    Email address
                  </FieldLabel>

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
                  <Button type="submit" className="w-full">
                    Join the waitlist
                  </Button>

                  <FieldDescription className="text-center">
                    {"Already have an account? "}
                    <Link href="/login" className="underline-offset-4 hover:underline">
                      Login
                    </Link>
                  </FieldDescription>

                </Field>
              </FieldGroup>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {` We'll notify you when Passline is ready.
                No spam, just launch updates.`}
              </p>
            </form>
          </CardContent>
        </Card>

        {/* <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Passline
        </p> */}
      </div>
    </div>
  )
}
