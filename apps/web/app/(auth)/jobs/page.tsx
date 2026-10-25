import Link from "next/link"
import { JobService, ResultsService } from "@passline/core"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/session"
import { Fragment } from "react/jsx-runtime"
import { Metadata } from "next"
import JobList from "./(components)/job-list"

export const metadata: Metadata = { title: "Jobs" }

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

  // merge score into each row so the table can render it
  const rows = filtered.map((job) => ({
    ...job,
    score: scores.get(job.id) ?? null,
  }))

  return (
    <Fragment>
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

      <JobList data={rows} />
    </Fragment>
  )
}