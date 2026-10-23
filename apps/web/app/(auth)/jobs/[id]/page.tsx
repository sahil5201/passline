import Link from "next/link"
import { notFound } from "next/navigation"
import {
  JobService,
  ResultsService,
  ResumeService,
  ServiceError,
} from "@passline/core"
import { deleteJobAction, toggleQueueJobAction, updateJobAction } from "@/app/actions/jobs"
import { updateSurveyAction } from "@/app/actions/tracking"
import { AppShell } from "@/components/app-shell"
import { ScoreBadge } from "@/components/score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { requireUser } from "@/lib/session"
import { toNavUser } from "@/lib/user-display"

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser()
  const jobs = new JobService(supabase, user.id)
  const results = new ResultsService(supabase, user.id)

  let job
  try {
    job = await jobs.getById(id)
  } catch (err) {
    if (err instanceof ServiceError && err.status === 404) notFound()
    throw err
  }

  const latest = await results.getLatestForJob(id)
  const tracking = await results.getApplicationTracking(id)
  let resumeLabel: string | null = null
  if (latest) {
    try {
      resumeLabel = (await new ResumeService(supabase, user.id).getById(latest.resume_id)).label
    } catch {
      resumeLabel = null
    }
  }

  const suggested = Array.isArray(latest?.suggested_changes)
    ? (latest!.suggested_changes as Array<{
        section?: string
        suggested?: string
        rationale?: string
        original?: string | null
      }>)
    : []
  const missing = Array.isArray(latest?.missing_keywords)
    ? (latest!.missing_keywords as string[])
    : []
  const matched = Array.isArray(latest?.matched_keywords)
    ? (latest!.matched_keywords as string[])
    : []
  const formatting = Array.isArray(latest?.formatting_issues)
    ? (latest!.formatting_issues as string[])
    : []

  return (
    <AppShell title={job.title} user={toNavUser(user)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
          ← Jobs
        </Button>
        <Badge variant="outline">{job.status}</Badge>
        <ScoreBadge score={latest ? Number(latest.score) : null} />
        {resumeLabel ? <Badge variant="secondary">Resume: {resumeLabel}</Badge> : null}
        <form action={toggleQueueJobAction}>
          <input type="hidden" name="id" value={job.id} />
          <input
            type="hidden"
            name="queued"
            value={job.status === "queued" ? "false" : "true"}
          />
          <Button type="submit" size="sm" variant="outline">
            {job.status === "queued" ? "Unqueue" : "Queue for ATS"}
          </Button>
        </form>
        <form action={deleteJobAction}>
          <input type="hidden" name="id" value={job.id} />
          <Button type="submit" size="sm" variant="destructive">
            Delete
          </Button>
        </form>
      </div>

      {latest ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest ATS result</CardTitle>
            <CardDescription>
              Rubric {latest.rubric_version}
              {latest.model_used ? ` · Model ${latest.model_used}` : ""}
              {" · "}
              {new Date(latest.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium">Missing keywords</p>
              <p className="text-muted-foreground">
                {missing.length ? missing.join(", ") : "None listed"}
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium">Matched keywords</p>
              <p className="text-muted-foreground">
                {matched.length ? matched.join(", ") : "None listed"}
              </p>
            </div>
            {formatting.length ? (
              <div>
                <p className="mb-1 font-medium">Formatting issues</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {formatting.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {suggested.length ? (
              <div>
                <p className="mb-2 font-medium">Suggested changes</p>
                <ul className="space-y-3">
                  {suggested.map((s, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <p className="font-medium">{s.section ?? "Section"}</p>
                      {s.original ? (
                        <p className="mt-1 text-muted-foreground line-through">{s.original}</p>
                      ) : null}
                      <p className="mt-1">{s.suggested}</p>
                      {s.rationale ? (
                        <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No ATS result yet</CardTitle>
            <CardDescription>
              Use MCP <code>check_ats_compatibility</code> with this job_id, then{" "}
              <code>save_ats_result</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post-result survey</CardTitle>
          <CardDescription>Track whether ATS changes helped.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSurveyAction} className="grid max-w-lg gap-4">
            <input type="hidden" name="job_id" value={job.id} />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Did you apply with the ATS changes?
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="applied_with_ats_changes"
                  value="yes"
                  defaultChecked={tracking?.applied_with_ats_changes === true}
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="applied_with_ats_changes"
                  value="no"
                  defaultChecked={tracking?.applied_with_ats_changes === false}
                />
                No
              </label>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="heard_back">Did you hear back?</Label>
              <select
                id="heard_back"
                name="heard_back"
                defaultValue={tracking?.heard_back ?? "none"}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="none">Not set</option>
                <option value="no_response">No response</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <Button type="submit" className="w-fit">
              Save survey
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit job</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateJobAction} className="space-y-4">
            <input type="hidden" name="id" value={job.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={job.title} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" defaultValue={job.company ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job_url">URL</Label>
                <Input id="job_url" name="job_url" defaultValue={job.job_url ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Input id="role" name="role" defaultValue={job.role ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={job.industry ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_added">Date added</Label>
                <Input id="date_added" name="date_added" type="date" defaultValue={job.date_added} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_applied">Date applied</Label>
                <Input
                  id="date_applied"
                  name="date_applied"
                  type="date"
                  defaultValue={job.date_applied ?? ""}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jd_text">Job description</Label>
              <Textarea id="jd_text" name="jd_text" defaultValue={job.jd_text} rows={12} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={job.notes ?? ""} rows={3} />
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  )
}
