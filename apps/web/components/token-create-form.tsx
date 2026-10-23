"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateResult = { token: string; id: string; prefix: string }

export function TokenCreateForm({
  action,
}: {
  action: (formData: FormData) => Promise<CreateResult>
}) {
  const [pending, startTransition] = useTransition()
  const [created, setCreated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          setError(null)
          startTransition(async () => {
            try {
              const result = await action(fd)
              setCreated(result.token)
              e.currentTarget.reset()
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create token")
            }
          })
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="name">Token name</Label>
          <Input id="name" name="name" required placeholder="Claude desktop" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create token"}
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {created ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Copy this token now — it won&apos;t be shown again.</p>
          <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs">
            {created}
          </code>
        </div>
      ) : null}
    </div>
  )
}
