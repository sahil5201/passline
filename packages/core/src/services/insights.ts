import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"

export type TrackerInsights = {
  total_jobs: number
  analyzed_jobs: number
  queued_jobs: number
  applications_tracked: number
  ats_optimized_count: number
  non_optimized_count: number
  response_rate_ats_optimized: number | null
  response_rate_non_optimized: number | null
  avg_score_by_resume: Array<{
    resume_id: string
    label: string
    avg_score: number
    result_count: number
  }>
  recent_scores: Array<{
    job_id: string
    job_title: string
    score: number
    resume_label: string | null
    model_used: string | null
    created_at: string
  }>
}

function isPositiveResponse(heard: string): boolean {
  return heard === "interview" || heard === "offer"
}

/**
 * Analytics for tracker dashboard (plan §5.6 / Phase 5 insights).
 */
export class InsightsService {
  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
  }

  async getTrackerInsights(): Promise<TrackerInsights> {
    const [jobsRes, trackingRes, resultsRes, resumesRes] = await Promise.all([
      this.db.from("jobs").select("id, title, status").eq("user_id", this.userId),
      this.db
        .from("application_tracking")
        .select("job_id, applied_with_ats_changes, heard_back")
        .eq("user_id", this.userId),
      this.db
        .from("ats_results")
        .select("id, job_id, resume_id, score, model_used, created_at")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false }),
      this.db
        .from("resumes")
        .select("id, label")
        .eq("user_id", this.userId),
    ])

    if (jobsRes.error) throw new ServiceError("DB_ERROR", jobsRes.error.message, 500)
    if (trackingRes.error)
      throw new ServiceError("DB_ERROR", trackingRes.error.message, 500)
    if (resultsRes.error)
      throw new ServiceError("DB_ERROR", resultsRes.error.message, 500)
    if (resumesRes.error)
      throw new ServiceError("DB_ERROR", resumesRes.error.message, 500)

    const jobs = jobsRes.data ?? []
    const tracking = trackingRes.data ?? []
    const results = resultsRes.data ?? []
    const resumes = resumesRes.data ?? []
    const resumeLabel = new Map(resumes.map((r) => [r.id, r.label]))
    const jobTitle = new Map(jobs.map((j) => [j.id, j.title]))

    const atsOpt = tracking.filter((t) => t.applied_with_ats_changes === true)
    const nonOpt = tracking.filter((t) => t.applied_with_ats_changes === false)

    const rate = (rows: typeof tracking) => {
      if (rows.length === 0) return null
      const responded = rows.filter(
        (r) => r.heard_back !== "none" && r.heard_back !== "no_response",
      )
      // Count interview/offer as positive signal for “response rate”
      const positive = rows.filter((r) => isPositiveResponse(r.heard_back))
      void responded
      return Math.round((positive.length / rows.length) * 1000) / 10
    }

    const byResume = new Map<
      string,
      { sum: number; count: number; label: string }
    >()
    for (const row of results) {
      const label = resumeLabel.get(row.resume_id) ?? "Unknown"
      const cur = byResume.get(row.resume_id) ?? { sum: 0, count: 0, label }
      cur.sum += Number(row.score)
      cur.count += 1
      byResume.set(row.resume_id, cur)
    }

    const latestByJob = new Map<string, (typeof results)[number]>()
    for (const row of results) {
      if (!latestByJob.has(row.job_id)) latestByJob.set(row.job_id, row)
    }

    return {
      total_jobs: jobs.length,
      analyzed_jobs: jobs.filter((j) => j.status === "analyzed").length,
      queued_jobs: jobs.filter((j) => j.status === "queued").length,
      applications_tracked: tracking.length,
      ats_optimized_count: atsOpt.length,
      non_optimized_count: nonOpt.length,
      response_rate_ats_optimized: rate(atsOpt),
      response_rate_non_optimized: rate(nonOpt),
      avg_score_by_resume: [...byResume.entries()].map(([resume_id, v]) => ({
        resume_id,
        label: v.label,
        avg_score: Math.round((v.sum / v.count) * 10) / 10,
        result_count: v.count,
      })),
      recent_scores: [...latestByJob.values()].slice(0, 20).map((r) => ({
        job_id: r.job_id,
        job_title: jobTitle.get(r.job_id) ?? "Job",
        score: Number(r.score),
        resume_label: resumeLabel.get(r.resume_id) ?? null,
        model_used: r.model_used,
        created_at: r.created_at,
      })),
    }
  }
}
