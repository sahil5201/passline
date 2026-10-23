import Link from "next/link"
import { JobService, ResultsService } from "@passline/core"
import { deleteJobAction, toggleQueueJobAction } from "@/app/actions/jobs"
import { AppShell } from "@/components/app-shell"
import { ScoreBadge } from "@/components/score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireUser } from "@/lib/session"
import { toNavUser } from "@/lib/user-display"

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const { supabase, user } = await requireUser()
  const jobs = await new JobService(supabase, user.id).list()
  const resultsService = new ResultsService(supabase, user.id)

  const scores = new Map<string, number>()
  await Promise.all(
    jobs.map(async (job) => {
      const latest = await resultsService.getLatestForJob(job.id)
      if (latest) scores.set(job.id, Number(latest.score))
    }),
  )

  const filtered =
    status && ["saved", "queued", "analyzed"].includes(status)
      ? jobs.filter((j) => j.status === status)
      : jobs

  return (
    <AppShell title="Jobs" user={toNavUser(user)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["saved", "Saved"],
            ["queued", "Queued"],
            ["analyzed", "Analyzed"],
          ].map(([value, label]) => {
            const href = value === "all" ? "/jobs" : `/jobs?status=${value}`
            const active = (value === "all" && !status) || status === value
            return (
              <Button
                key={value}
                size="sm"
                variant={active ? "default" : "outline"}
                render={<Link href={href} />}
              >
                {label}
              </Button>
            )
          })}
        </div>
        <Button render={<Link href="/jobs/new" />}>Add job</Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No jobs yet. Add a JD and optionally queue it for bulk MCP checks.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>{job.company ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={scores.get(job.id) ?? null} />
                  </TableCell>
                  <TableCell>
                    <form action={toggleQueueJobAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <input
                        type="hidden"
                        name="queued"
                        value={job.status === "queued" ? "false" : "true"}
                      />
                      <Button type="submit" size="xs" variant="outline">
                        {job.status === "queued" ? "Unqueue" : "Queue"}
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteJobAction} className="inline">
                      <input type="hidden" name="id" value={job.id} />
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
    </AppShell>
  )
}
