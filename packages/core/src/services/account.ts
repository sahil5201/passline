import { RESUME_STORAGE_BUCKET } from "../limits"
import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"

/**
 * Delete all user app data (plan §10 privacy).
 * Auth user deletion should be done by the caller via supabase.auth.admin or user.delete().
 */
export class AccountService {
  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
  }

  async deleteAllData(): Promise<void> {
    // Storage objects under {user_id}/
    const { data: files, error: listError } = await this.db.storage
      .from(RESUME_STORAGE_BUCKET)
      .list(this.userId, { limit: 1000 })

    if (listError) {
      // Bucket may be empty / missing during local dev
      console.warn("storage list:", listError.message)
    } else if (files?.length) {
      // Nested folders: list resume_id folders then files
      const paths: string[] = []
      for (const entry of files) {
        if (entry.id === null) {
          const { data: nested } = await this.db.storage
            .from(RESUME_STORAGE_BUCKET)
            .list(`${this.userId}/${entry.name}`, { limit: 100 })
          for (const f of nested ?? []) {
            paths.push(`${this.userId}/${entry.name}/${f.name}`)
          }
        } else {
          paths.push(`${this.userId}/${entry.name}`)
        }
      }
      if (paths.length) {
        await this.db.storage.from(RESUME_STORAGE_BUCKET).remove(paths)
      }
    }

    // Cascades: jobs → ats_results / application_tracking; resumes; api_tokens
    const tables = ["api_tokens", "ats_results", "application_tracking", "jobs", "resumes"] as const
    for (const table of tables) {
      const { error } = await this.db.from(table).delete().eq("user_id", this.userId)
      if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    }
  }
}
