import type { Tables } from "@passline/db"
import { LIMITS } from "../limits"
import type { CreateJobInput, UpdateJobInput } from "../schemas/job"
import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"

export type JobRow = Tables<"jobs">

export class JobService {
  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
  }

  async list(): Promise<JobRow[]> {
    const { data, error } = await this.db
      .from("jobs")
      .select("*")
      .eq("user_id", this.userId)
      .order("date_added", { ascending: false })

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data ?? []
  }

  async getById(jobId: string): Promise<JobRow> {
    const { data, error } = await this.db
      .from("jobs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", jobId)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    if (!data) throw new ServiceError("NOT_FOUND", "Job not found", 404)
    return data
  }

  async create(input: CreateJobInput): Promise<JobRow> {
    if (input.jd_text.length > LIMITS.maxJdLength) {
      throw new ServiceError(
        "LIMIT_EXCEEDED",
        `JD text must be ≤ ${LIMITS.maxJdLength} characters`,
        403,
      )
    }

    const { data, error } = await this.db
      .from("jobs")
      .insert({
        user_id: this.userId,
        title: input.title,
        company: input.company ?? null,
        job_url: input.job_url ?? null,
        date_added: input.date_added,
        date_applied: input.date_applied ?? null,
        jd_text: input.jd_text,
        role: input.role ?? null,
        industry: input.industry ?? null,
        status: input.status ?? "saved",
        notes: input.notes ?? null,
      })
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  async update(jobId: string, input: UpdateJobInput): Promise<JobRow> {
    await this.getById(jobId)

    if (input.jd_text && input.jd_text.length > LIMITS.maxJdLength) {
      throw new ServiceError(
        "LIMIT_EXCEEDED",
        `JD text must be ≤ ${LIMITS.maxJdLength} characters`,
        403,
      )
    }

    const { data, error } = await this.db
      .from("jobs")
      .update({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.company !== undefined ? { company: input.company } : {}),
        ...(input.job_url !== undefined ? { job_url: input.job_url } : {}),
        ...(input.date_added !== undefined
          ? { date_added: input.date_added }
          : {}),
        ...(input.date_applied !== undefined
          ? { date_applied: input.date_applied }
          : {}),
        ...(input.jd_text !== undefined ? { jd_text: input.jd_text } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.industry !== undefined ? { industry: input.industry } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .eq("user_id", this.userId)
      .eq("id", jobId)
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  async setQueued(jobId: string, queued: boolean): Promise<JobRow> {
    const job = await this.getById(jobId)
    if (job.status === "analyzed" && queued) {
      // Allow re-queue after analysis
    }
    return this.update(jobId, { status: queued ? "queued" : "saved" })
  }

  async listQueued(): Promise<JobRow[]> {
    const { data, error } = await this.db
      .from("jobs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "queued")
      .order("date_added", { ascending: true })

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data ?? []
  }

  async listQueuedBatch(limit: number = LIMITS.bulkAtsMaxJobs): Promise<{
    jobs: JobRow[]
    remaining_count: number
  }> {
    const capped = Math.min(Math.max(1, limit), LIMITS.bulkAtsMaxJobs)
    const queued = await this.listQueued()
    return {
      jobs: queued.slice(0, capped),
      remaining_count: Math.max(0, queued.length - capped),
    }
  }

  async markAnalyzed(jobId: string): Promise<JobRow> {
    return this.update(jobId, { status: "analyzed" })
  }

  async delete(jobId: string): Promise<void> {
    await this.getById(jobId)
    const { error } = await this.db
      .from("jobs")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", jobId)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
  }

  /**
   * Create a job from raw JD text when save_ats_result is called without job_id.
   */
  async createFromJdText(opts: {
    jd_text: string
    title?: string
    company?: string | null
    role?: string | null
    industry?: string | null
  }): Promise<JobRow> {
    const title =
      opts.title?.trim() ||
      opts.jd_text.trim().split("\n").find((l) => l.trim().length > 0)?.slice(0, 80) ||
      "Untitled job"

    return this.create({
      title,
      company: opts.company ?? null,
      jd_text: opts.jd_text,
      role: opts.role ?? null,
      industry: opts.industry ?? null,
      status: "saved",
    })
  }
}
