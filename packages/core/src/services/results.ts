import type { Tables } from "@passline/db"
import { atsAnalysisOutputSchema } from "../schemas/ats-result"
import type {
  AtsAnalysisOutput,
  SaveAtsResultInput,
  UpdateApplicationStatusInput,
} from "../schemas/ats-result"
import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"
import { JobService } from "./jobs"
import { ResumeService } from "./resumes"

export type AtsResultRow = Tables<"ats_results">
export type ApplicationTrackingRow = Tables<"application_tracking">

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string")
}

function parseResultRow(row: AtsResultRow): AtsResultRow & {
  matched_keywords: string[]
  missing_keywords: string[]
  formatting_issues: string[]
} {
  return {
    ...row,
    matched_keywords: asStringArray(row.matched_keywords),
    missing_keywords: asStringArray(row.missing_keywords),
    formatting_issues: asStringArray(row.formatting_issues),
  }
}

export class ResultsService {
  private readonly jobs: JobService
  private readonly resumes: ResumeService

  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
    this.jobs = new JobService(db, userId)
    this.resumes = new ResumeService(db, userId)
  }

  async getLatestForJob(jobId: string): Promise<AtsResultRow | null> {
    await this.jobs.getById(jobId)

    const { data, error } = await this.db
      .from("ats_results")
      .select("*")
      .eq("user_id", this.userId)
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data ? parseResultRow(data) : null
  }

  async listForUser(limit = 50): Promise<AtsResultRow[]> {
    const { data, error } = await this.db
      .from("ats_results")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return (data ?? []).map(parseResultRow)
  }

  /**
   * Validate AI output, resolve/create job, persist result, mark job analyzed.
   */
  async saveAtsResult(input: SaveAtsResultInput): Promise<{
    result: AtsResultRow
    job_id: string
    resume_id: string
  }> {
    const parsed: AtsAnalysisOutput = atsAnalysisOutputSchema.parse(input.result)

    let jobId = input.job_id
    if (!jobId) {
      if (!input.jd_text) {
        throw new ServiceError(
          "VALIDATION",
          "Provide job_id or jd_text",
          400,
        )
      }
      const created = await this.jobs.createFromJdText({
        jd_text: input.jd_text,
        title: input.title,
        company: input.company,
        role: input.role,
        industry: input.industry,
      })
      jobId = created.id
    } else {
      await this.jobs.getById(jobId)
    }

    const resume = await this.resumes.getActiveOrById(input.resume_id)

    const { data, error } = await this.db
      .from("ats_results")
      .insert({
        user_id: this.userId,
        job_id: jobId,
        resume_id: resume.id,
        score: parsed.score,
        matched_keywords: parsed.matched_keywords,
        missing_keywords: parsed.missing_keywords,
        section_feedback: parsed.section_feedback,
        formatting_issues: parsed.formatting_issues,
        suggested_changes: parsed.suggested_changes,
        rubric_version: parsed.rubric_version,
        model_used: parsed.model_used ?? null,
      })
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)

    await this.jobs.markAnalyzed(jobId)

    return {
      result: parseResultRow(data),
      job_id: jobId,
      resume_id: resume.id,
    }
  }

  async upsertApplicationTracking(
    input: UpdateApplicationStatusInput,
  ): Promise<ApplicationTrackingRow> {
    await this.jobs.getById(input.job_id)

    const { data: existing } = await this.db
      .from("application_tracking")
      .select("*")
      .eq("user_id", this.userId)
      .eq("job_id", input.job_id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await this.db
        .from("application_tracking")
        .update({
          ...(input.applied_with_ats_changes !== undefined
            ? { applied_with_ats_changes: input.applied_with_ats_changes }
            : {}),
          ...(input.heard_back !== undefined
            ? { heard_back: input.heard_back }
            : {}),
        })
        .eq("user_id", this.userId)
        .eq("job_id", input.job_id)
        .select("*")
        .single()

      if (error) throw new ServiceError("DB_ERROR", error.message, 500)
      return data
    }

    const { data, error } = await this.db
      .from("application_tracking")
      .insert({
        job_id: input.job_id,
        user_id: this.userId,
        applied_with_ats_changes: input.applied_with_ats_changes ?? null,
        heard_back: input.heard_back ?? "none",
      })
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  async getApplicationTracking(
    jobId: string,
  ): Promise<ApplicationTrackingRow | null> {
    await this.jobs.getById(jobId)
    const { data, error } = await this.db
      .from("application_tracking")
      .select("*")
      .eq("user_id", this.userId)
      .eq("job_id", jobId)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }
}
