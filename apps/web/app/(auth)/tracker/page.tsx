import Link from "next/link"
import {
  InsightsService,
  JobService,
  ResultsService,
} from "@passline/core"
import { ScoreBadge } from "@/components/score-badge"
import { Badge } from "@/components/ui/badge"
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
  title: "Tracker",
};

export default async function TrackerPage() {
  const { supabase, user } = await requireUser()
  const insights = await new InsightsService(supabase, user.id).getTrackerInsights()
  const jobs = await new JobService(supabase, user.id).list()
  const resultsService = new ResultsService(supabase, user.id)

  const rows = await Promise.all(
    jobs.map(async (job) => {
      const latest = await resultsService.getLatestForJob(job.id)
      const tracking = await resultsService.getApplicationTracking(job.id)
      return { job, latest, tracking }
    }),
  )

  const columns = {
    saved: rows.filter((r) => r.job.status === "saved"),
    queued: rows.filter((r) => r.job.status === "queued"),
    analyzed: rows.filter((r) => r.job.status === "analyzed"),
  }

  return (
    <Fragment>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Insight
          title="ATS-optimized response rate"
          value={
            insights.response_rate_ats_optimized == null
              ? "—"
              : `${insights.response_rate_ats_optimized}%`
          }
          hint={`${insights.ats_optimized_count} applications`}
        />
        <Insight
          title="Non-optimized response rate"
          value={
            insights.response_rate_non_optimized == null
              ? "—"
              : `${insights.response_rate_non_optimized}%`
          }
          hint={`${insights.non_optimized_count} applications`}
        />
        <Insight title="Queued" value={String(insights.queued_jobs)} hint="Ready for bulk MCP" />
        <Insight title="Analyzed" value={String(insights.analyzed_jobs)} hint="Have saved ATS results" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score by resume version</CardTitle>
          <CardDescription>Compare which version performs best</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {insights.avg_score_by_resume.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scores yet.</p>
          ) : (
            insights.avg_score_by_resume.map((r) => (
              <div key={r.resume_id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{r.label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ScoreBadge score={r.avg_score} />
                  <span className="text-xs text-muted-foreground">
                    n={r.result_count}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["saved", "queued", "analyzed"] as const).map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="capitalize text-base">{status}</CardTitle>
              <CardDescription>{columns[status].length} jobs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {columns[status].length === 0 ? (
                <p className="text-sm text-muted-foreground">Empty</p>
              ) : (
                columns[status].map(({ job, latest }) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{job.title}</span>
                      <ScoreBadge score={latest ? Number(latest.score) : null} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.company ?? "No company"}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>ATS changes?</TableHead>
              <TableHead>Heard back</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ job, latest, tracking }) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{job.status}</Badge>
                </TableCell>
                <TableCell>
                  <ScoreBadge score={latest ? Number(latest.score) : null} />
                </TableCell>
                <TableCell>
                  {tracking?.applied_with_ats_changes == null
                    ? "—"
                    : tracking.applied_with_ats_changes
                      ? "Yes"
                      : "No"}
                </TableCell>
                <TableCell>{tracking?.heard_back ?? "none"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Fragment>
  )
}

function Insight({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
