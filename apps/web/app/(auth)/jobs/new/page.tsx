import Link from "next/link"
import { LIMITS } from "@passline/core"
import { createJobAction } from "@/app/actions/jobs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { requireUser } from "@/lib/session"
import { Fragment } from "react/jsx-runtime"

export default async function NewJobPage() {
  const { user } = await requireUser()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Fragment>
      <div>
        <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
          ← Back
        </Button>
      </div>
      <form action={createJobAction} className="mx-auto w-full max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job_url">URL</Label>
            <Input id="job_url" name="job_url" type="url" placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Input id="role" name="role" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_added">Date added</Label>
            <Input id="date_added" name="date_added" type="date" defaultValue={today} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_applied">Date applied</Label>
            <Input id="date_applied" name="date_applied" type="date" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jd_text">Job description (max {LIMITS.maxJdLength.toLocaleString()} chars)</Label>
          <Textarea id="jd_text" name="jd_text" required rows={14} maxLength={LIMITS.maxJdLength} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="queued" />
          Queue for ATS check (bulk MCP)
        </label>
        <Button type="submit">Save job</Button>
      </form>
    </Fragment>
  )
}
