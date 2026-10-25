import Link from "next/link"
import {
  InsightsService,
  JobService,
  ResumeService,
} from "@passline/core"
import { ScoreBadge } from "@/components/score-badge"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireUser } from "@/lib/session"
import { cn } from "cn"
import { Fragment } from "react/jsx-runtime"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser()
  const insights = await new InsightsService(supabase, user.id).getTrackerInsights()
  const resumes = await new ResumeService(supabase, user.id).list()
  const jobs = await new JobService(supabase, user.id).list()
  const active = resumes.find((r) => r.is_active)

  return (
    <Fragment>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Resumes" value={String(resumes.length)} hint={active ? `Active: ${active.label}` : "No active resume"} />
        <StatCard title="Jobs" value={String(insights.total_jobs)} hint={`${insights.queued_jobs} queued · ${insights.analyzed_jobs} analyzed`} />
        <StatCard
          title="ATS response rate"
          value={
            insights.response_rate_ats_optimized == null
              ? "—"
              : `${insights.response_rate_ats_optimized}%`
          }
          hint="Interview/offer when applied with ATS changes"
        />
        <StatCard
          title="Tracked apps"
          value={String(insights.applications_tracked)}
          hint={`${insights.ats_optimized_count} ATS-optimized`}
        />
      </div>

      {insights.queued_jobs > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk ATS queue</CardTitle>
            <CardDescription>
              {insights.queued_jobs} job{insights.queued_jobs === 1 ? "" : "s"} queued.
              In your AI tool, run <code className="rounded bg-muted px-1">run_bulk_ats_check</code> (max 5 per call).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent scores</CardTitle>
              <CardDescription>Latest ATS result per job</CardDescription>
            </div>
            <Link
              href="/jobs"
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              Jobs
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recent_scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No results yet. Queue a job and run MCP check tools.
              </p>
            ) : (
              insights.recent_scores.slice(0, 8).map((row) => (
                <Link
                  key={row.job_id}
                  href={`/jobs/${row.job_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.job_title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.resume_label ?? "Resume"}
                      {row.model_used ? ` · ${row.model_used}` : ""}
                    </p>
                  </div>
                  <ScoreBadge score={row.score} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Score by resume version</CardTitle>
              <CardDescription>Average across saved analyses</CardDescription>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/resumes" />}>
              Resumes
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.avg_score_by_resume.length === 0 ? (
              <p className="text-sm text-muted-foreground">No version comparisons yet.</p>
            ) : (
              insights.avg_score_by_resume.map((row) => (
                <div
                  key={row.resume_id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.result_count} result{row.result_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ScoreBadge score={row.avg_score} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/resumes" />}>Manage resumes</Button>
        <Button variant="outline" render={<Link href="/jobs/new" />}>
          Add job
        </Button>
        <Button variant="outline" render={<Link href="/settings" />}>
          MCP tokens
        </Button>
        {jobs.length > 0 ? (
          <Badge variant="secondary">{jobs.filter((j) => j.status === "queued").length} in queue</Badge>
        ) : null}
      </div>
    </Fragment>
  )
}

function StatCard({
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
