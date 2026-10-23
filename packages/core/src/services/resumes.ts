import type { Tables } from "@passline/db"
import { LIMITS, RESUME_STORAGE_BUCKET } from "../limits"
import type {
  CreateResumeInput,
  ResumeSummary,
  UpdateResumeInput,
} from "../schemas/resume"
import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"

export type ResumeRow = Tables<"resumes">

/**
 * User-scoped resume repository.
 * Every query filters by userId — required for service-role (MCP) safety.
 */
export class ResumeService {
  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
  }

  async list(): Promise<ResumeSummary[]> {
    const { data, error } = await this.db
      .from("resumes")
      .select(
        "id, label, is_active, file_type, version_number, updated_at",
      )
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false })

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data ?? []
  }

  async getById(resumeId: string): Promise<ResumeRow> {
    const { data, error } = await this.db
      .from("resumes")
      .select("*")
      .eq("user_id", this.userId)
      .eq("id", resumeId)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    if (!data) throw new ServiceError("NOT_FOUND", "Resume not found", 404)
    return data
  }

  async getActive(): Promise<ResumeRow> {
    const { data, error } = await this.db
      .from("resumes")
      .select("*")
      .eq("user_id", this.userId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    if (!data) {
      throw new ServiceError(
        "NO_ACTIVE_RESUME",
        "No active resume. Upload one and set it as active.",
        404,
      )
    }
    return data
  }

  async getActiveOrById(resumeId?: string): Promise<ResumeRow> {
    return resumeId ? this.getById(resumeId) : this.getActive()
  }

  private async nextVersionNumber(): Promise<number> {
    const { data, error } = await this.db
      .from("resumes")
      .select("version_number")
      .eq("user_id", this.userId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return (data?.version_number ?? 0) + 1
  }

  private async countVersions(): Promise<number> {
    const { count, error } = await this.db
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return count ?? 0
  }

  async create(input: CreateResumeInput): Promise<ResumeRow> {
    const count = await this.countVersions()
    if (count >= LIMITS.maxResumeVersionsPerUser) {
      throw new ServiceError(
        "LIMIT_EXCEEDED",
        `Maximum of ${LIMITS.maxResumeVersionsPerUser} resume versions reached`,
        403,
      )
    }

    const version_number = await this.nextVersionNumber()
    const setActive = input.set_active || count === 0

    if (setActive) {
      await this.clearActive()
    }

    const { data, error } = await this.db
      .from("resumes")
      .insert({
        user_id: this.userId,
        label: input.label,
        file_type: input.file_type,
        extracted_text: input.extracted_text ?? "",
        original_file_url: input.original_file_url ?? null,
        notes: input.notes ?? null,
        version_number,
        is_active: setActive,
      })
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  async update(resumeId: string, input: UpdateResumeInput): Promise<ResumeRow> {
    await this.getById(resumeId)

    const { data, error } = await this.db
      .from("resumes")
      .update({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.extracted_text !== undefined
          ? { extracted_text: input.extracted_text }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .eq("user_id", this.userId)
      .eq("id", resumeId)
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  private async clearActive(): Promise<void> {
    const { error } = await this.db
      .from("resumes")
      .update({ is_active: false })
      .eq("user_id", this.userId)
      .eq("is_active", true)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
  }

  async setActive(resumeId: string): Promise<ResumeRow> {
    await this.getById(resumeId)
    await this.clearActive()

    const { data, error } = await this.db
      .from("resumes")
      .update({ is_active: true })
      .eq("user_id", this.userId)
      .eq("id", resumeId)
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return data
  }

  async delete(resumeId: string): Promise<void> {
    const resume = await this.getById(resumeId)
    const { error } = await this.db
      .from("resumes")
      .delete()
      .eq("user_id", this.userId)
      .eq("id", resumeId)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)

    if (resume.is_active) {
      const { data: latest } = await this.db
        .from("resumes")
        .select("id")
        .eq("user_id", this.userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latest) {
        await this.setActive(latest.id)
      }
    }
  }

  /**
   * Storage path: {user_id}/{resume_id}/original.{ext}
   */
  storagePath(resumeId: string, ext: string): string {
    const clean = ext.replace(/^\./, "").toLowerCase()
    return `${this.userId}/${resumeId}/original.${clean}`
  }

  async createSignedUrl(
    path: string,
    expiresIn = LIMITS.signedUrlExpiresInSeconds,
  ): Promise<string> {
    // Ensure path belongs to this user
    if (!path.startsWith(`${this.userId}/`)) {
      throw new ServiceError("FORBIDDEN", "Invalid storage path", 403)
    }

    const { data, error } = await this.db.storage
      .from(RESUME_STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn)

    if (error || !data?.signedUrl) {
      throw new ServiceError(
        "STORAGE_ERROR",
        error?.message ?? "Failed to create signed URL",
        500,
      )
    }
    return data.signedUrl
  }
}
