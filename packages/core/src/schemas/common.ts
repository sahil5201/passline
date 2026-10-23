import { z } from "zod"
import { LIMITS } from "../limits"

export const uuidSchema = z.uuid()

export const resumeFileTypeSchema = z.enum([
  "pdf",
  "doc",
  "docx",
  "md",
  "txt",
  "paste",
])

export const jobStatusSchema = z.enum(["saved", "queued", "analyzed"])

export const heardBackSchema = z.enum([
  "none",
  "no_response",
  "interview",
  "offer",
  "rejected",
])

export const jdTextSchema = z
  .string()
  .trim()
  .min(1, "Job description is required")
  .max(LIMITS.maxJdLength, `Job description must be ≤ ${LIMITS.maxJdLength} characters`)
