import { z } from "zod"
import { jdTextSchema, jobStatusSchema, uuidSchema } from "./common"

export const jobSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  title: z.string().trim().min(1).max(200),
  company: z.string().max(200).nullable(),
  job_url: z.string().url().nullable(),
  date_added: z.string(),
  date_applied: z.string().nullable(),
  jd_text: jdTextSchema,
  role: z.string().max(120).nullable(),
  industry: z.string().max(120).nullable(),
  status: jobStatusSchema,
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const createJobInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).nullable().optional(),
  job_url: z.string().url().nullable().optional(),
  date_added: z.string().optional(),
  date_applied: z.string().nullable().optional(),
  jd_text: jdTextSchema,
  role: z.string().trim().max(120).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  status: jobStatusSchema.optional().default("saved"),
  notes: z.string().max(4000).nullable().optional(),
})

export const updateJobInputSchema = createJobInputSchema.partial()

export const queueJobInputSchema = z.object({
  job_id: uuidSchema,
  queued: z.boolean(),
})

export type Job = z.infer<typeof jobSchema>
export type CreateJobInput = z.infer<typeof createJobInputSchema>
export type UpdateJobInput = z.infer<typeof updateJobInputSchema>
