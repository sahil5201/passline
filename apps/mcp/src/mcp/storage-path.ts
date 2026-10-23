import type { ResumeRow } from "@passline/core"

/** Resolve a private-bucket object path for signed URL creation. */
export function resolveResumeStoragePath(
  resume: ResumeRow,
  userId: string,
): string | null {
  const stored = resume.original_file_url?.trim()
  if (!stored) {
    if (resume.file_type === "paste") return null
    return `${userId}/${resume.id}/original.${resume.file_type}`
  }

  if (stored.startsWith(`${userId}/`)) return stored

  // Supabase public/signed object URLs: .../object/(sign|public)/resumes/<path>
  const match = stored.match(/\/object\/(?:sign|public)\/resumes\/([^?]+)/)
  if (match?.[1]) {
    const path = decodeURIComponent(match[1])
    if (path.startsWith(`${userId}/`)) return path
  }

  if (resume.file_type !== "paste") {
    return `${userId}/${resume.id}/original.${resume.file_type}`
  }

  return null
}
