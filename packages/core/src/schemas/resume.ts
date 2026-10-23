import { z } from "zod"
import { resumeFileTypeSchema, uuidSchema } from "./common"

export const resumeSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  label: z.string().trim().min(1).max(120),
  original_file_url: z.string().nullable(),
  file_type: resumeFileTypeSchema,
  extracted_text: z.string(),
  is_active: z.boolean(),
  version_number: z.number().int().positive(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const resumeSummarySchema = z.object({
  id: uuidSchema,
  label: z.string(),
  is_active: z.boolean(),
  file_type: resumeFileTypeSchema,
  version_number: z.number().int().positive(),
  updated_at: z.string(),
})

export const createResumeInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  file_type: resumeFileTypeSchema,
  extracted_text: z.string().default(""),
  original_file_url: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  set_active: z.boolean().optional().default(false),
})

export const updateResumeInputSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  extracted_text: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export type Resume = z.infer<typeof resumeSchema>
export type ResumeSummary = z.infer<typeof resumeSummarySchema>
export type CreateResumeInput = z.infer<typeof createResumeInputSchema>
export type UpdateResumeInput = z.infer<typeof updateResumeInputSchema>
