import { z } from "zod"
import { LIMITS } from "../limits"
import {
  atsAnalysisOutputSchema,
  saveAtsResultInputSchema,
  updateApplicationStatusInputSchema,
} from "./ats-result"
import { jdTextSchema, uuidSchema } from "./common"
import { resumeSummarySchema } from "./resume"

/** list_resumes — no input */
export const listResumesInputSchema = z.object({})

export const listResumesOutputSchema = z.object({
  resumes: z.array(resumeSummarySchema),
})

/** get_resume */
export const getResumeInputSchema = z.object({
  resume_id: uuidSchema.optional().describe("Defaults to the active resume"),
  format: z
    .enum(["text", "original"])
    .optional()
    .default("text")
    .describe('Use "original" for a short-lived signed URL to the uploaded file'),
})

export const getResumeOutputSchema = z.object({
  resume_id: uuidSchema,
  label: z.string(),
  is_active: z.boolean(),
  file_type: z.string(),
  format: z.enum(["text", "original"]),
  text: z.string().optional(),
  signed_url: z.string().url().optional(),
  signed_url_expires_in_seconds: z.number().int().positive().optional(),
})

/** set_active_resume (optional tool) */
export const setActiveResumeInputSchema = z.object({
  resume_id: uuidSchema,
})

export const setActiveResumeOutputSchema = z.object({
  resume_id: uuidSchema,
  label: z.string(),
  is_active: z.literal(true),
})

/** check_ats_compatibility */
export const checkAtsCompatibilityInputSchema = z
  .object({
    jd_text: jdTextSchema.optional(),
    job_id: uuidSchema.optional(),
    resume_id: uuidSchema.optional().describe("Defaults to the active resume"),
    role: z.string().trim().max(120).optional(),
    industry: z.string().trim().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.jd_text && !value.job_id) {
      ctx.addIssue({
        code: "custom",
        message: "Provide jd_text or job_id",
        path: ["jd_text"],
      })
    }
  })

export const checkAtsCompatibilityOutputSchema = z.object({
  resume: z.object({
    id: uuidSchema,
    label: z.string(),
    text: z.string(),
  }),
  job: z.object({
    id: uuidSchema.nullable(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    jd_text: z.string(),
    role: z.string().nullable(),
    industry: z.string().nullable(),
  }),
  rubric_version: z.string(),
  ats_prompt: z.string(),
  required_output_schema: z.record(z.string(), z.unknown()),
  instructions: z.string(),
})

/** save_ats_result — re-exports analysis validation */
export { saveAtsResultInputSchema, atsAnalysisOutputSchema }

export const saveAtsResultOutputSchema = z.object({
  result_id: uuidSchema,
  job_id: uuidSchema,
  resume_id: uuidSchema,
  score: z.number().min(0).max(100),
  status: z.literal("analyzed"),
})

/** list_pending_jobs */
export const listPendingJobsInputSchema = z.object({})

export const listPendingJobsOutputSchema = z.object({
  jobs: z.array(
    z.object({
      id: uuidSchema,
      title: z.string(),
      company: z.string().nullable(),
      role: z.string().nullable(),
      industry: z.string().nullable(),
      status: z.literal("queued"),
      date_added: z.string(),
    }),
  ),
  count: z.number().int().nonnegative(),
})

/** run_bulk_ats_check */
export const runBulkAtsCheckInputSchema = z.object({
  resume_id: uuidSchema.optional().describe("Defaults to the active resume"),
  limit: z
    .number()
    .int()
    .positive()
    .max(LIMITS.bulkAtsMaxJobs)
    .optional()
    .default(LIMITS.bulkAtsMaxJobs),
})

export const runBulkAtsCheckOutputSchema = z.object({
  resume: z.object({
    id: uuidSchema,
    label: z.string(),
    text: z.string(),
  }),
  jobs: z.array(
    z.object({
      id: uuidSchema,
      title: z.string(),
      company: z.string().nullable(),
      jd_text: z.string(),
      role: z.string().nullable(),
      industry: z.string().nullable(),
    }),
  ),
  returned_count: z.number().int().nonnegative(),
  remaining_count: z.number().int().nonnegative(),
  rubric_version: z.string(),
  ats_prompt: z.string(),
  required_output_schema: z.record(z.string(), z.unknown()),
  instructions: z.string(),
})

/** update_application_status (optional tool) */
export { updateApplicationStatusInputSchema }

export const updateApplicationStatusOutputSchema = z.object({
  job_id: uuidSchema,
  applied_with_ats_changes: z.boolean().nullable(),
  heard_back: z.enum([
    "none",
    "no_response",
    "interview",
    "offer",
    "rejected",
  ]),
})

export const mcpToolNames = [
  "list_resumes",
  "get_resume",
  "set_active_resume",
  "check_ats_compatibility",
  "save_ats_result",
  "list_pending_jobs",
  "run_bulk_ats_check",
  "update_application_status",
] as const

export type McpToolName = (typeof mcpToolNames)[number]
