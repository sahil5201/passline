import { z } from "zod"
import { uuidSchema } from "./common"

/** Strict JSON the user AI must produce and that save_ats_result validates. */
export const suggestedChangeSchema = z.object({
  section: z.string().min(1).describe("Resume section to edit, e.g. Experience, Skills"),
  original: z
    .string()
    .nullable()
    .optional()
    .describe("Existing text being rewritten; null when suggesting an addition"),
  suggested: z.string().min(1).describe("Truthful rewrite or reordering suggestion"),
  rationale: z.string().min(1).describe("Why this change improves ATS fit"),
})

export const sectionFeedbackSchema = z.record(z.string(), z.string())

export const atsAnalysisOutputSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall ATS compatibility score 0–100 using the weighted rubric"),
  matched_keywords: z
    .array(z.string())
    .describe("Keywords/skills from the JD that appear in the resume"),
  missing_keywords: z
    .array(z.string())
    .describe("Important JD keywords/skills missing from the resume"),
  section_feedback: sectionFeedbackSchema.describe(
    "Per-section notes keyed by section name (summary, experience, skills, etc.)",
  ),
  formatting_issues: z
    .array(z.string())
    .describe("Parseability/formatting problems (tables, columns, graphics, odd headings)"),
  suggested_changes: z
    .array(suggestedChangeSchema)
    .describe("Concrete truthful rewrites only — never fabricate experience"),
  rubric_version: z.string().min(1).describe("Must match the rubric version provided in the prompt"),
  model_used: z
    .string()
    .min(1)
    .optional()
    .describe("Model identifier if the client knows it"),
})

export const saveAtsResultInputSchema = z.object({
  job_id: uuidSchema.optional(),
  jd_text: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  company: z.string().trim().max(200).nullable().optional(),
  role: z.string().trim().max(120).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  resume_id: uuidSchema.optional(),
  result: atsAnalysisOutputSchema,
}).superRefine((value, ctx) => {
  if (!value.job_id && !value.jd_text) {
    ctx.addIssue({
      code: "custom",
      message: "Provide job_id or jd_text",
      path: ["job_id"],
    })
  }
})

export const atsResultRecordSchema = z.object({
  id: uuidSchema,
  job_id: uuidSchema,
  resume_id: uuidSchema,
  user_id: uuidSchema,
  score: z.number().min(0).max(100),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  section_feedback: sectionFeedbackSchema,
  formatting_issues: z.array(z.string()),
  suggested_changes: z.array(suggestedChangeSchema),
  rubric_version: z.string(),
  model_used: z.string().nullable(),
  created_at: z.string(),
})

export const applicationTrackingSchema = z.object({
  job_id: uuidSchema,
  user_id: uuidSchema,
  applied_with_ats_changes: z.boolean().nullable(),
  heard_back: z.enum([
    "none",
    "no_response",
    "interview",
    "offer",
    "rejected",
  ]),
  updated_at: z.string(),
})

export const updateApplicationStatusInputSchema = z.object({
  job_id: uuidSchema,
  applied_with_ats_changes: z.boolean().nullable().optional(),
  heard_back: z
    .enum(["none", "no_response", "interview", "offer", "rejected"])
    .optional(),
})

export type AtsAnalysisOutput = z.infer<typeof atsAnalysisOutputSchema>
export type SaveAtsResultInput = z.infer<typeof saveAtsResultInputSchema>
export type AtsResultRecord = z.infer<typeof atsResultRecordSchema>
export type SuggestedChange = z.infer<typeof suggestedChangeSchema>
export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusInputSchema
>
