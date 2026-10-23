/** Free-tier abuse protection (plan §8). Billing tiers can replace these later. */

export const LIMITS = {
  /** Max resume upload size in bytes (5 MB). */
  maxResumeFileBytes: 5 * 1024 * 1024,
  /** Max resume versions per user. */
  maxResumeVersionsPerUser: 10,
  /** Max job description length in characters. */
  maxJdLength: 15_000,
  /** Max jobs returned per bulk ATS check. */
  bulkAtsMaxJobs: 5,
  /** Signed URL TTL for original resume downloads (seconds). */
  signedUrlExpiresInSeconds: 60 * 5,
  /** MCP rate limits (in-memory starter; move to Redis/Postgres when scaling). */
  mcpRateLimitPerMinute: 60,
  mcpRateLimitPerDay: 1_000,
} as const

export const RESUME_STORAGE_BUCKET = "resumes" as const

export const ALLOWED_RESUME_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "md",
  "txt",
] as const

export type AllowedResumeExtension = (typeof ALLOWED_RESUME_EXTENSIONS)[number]
