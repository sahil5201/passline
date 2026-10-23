import { z } from "zod"
import { uuidSchema } from "./common"

export const apiTokenSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: z.string().trim().min(1).max(80),
  prefix: z.string().min(1),
  last_used_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  created_at: z.string(),
})

export const createApiTokenInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

/** Shown once to the user; never persisted. */
export const createApiTokenResultSchema = z.object({
  token: z.string().min(1),
  record: apiTokenSchema,
})

export type ApiToken = z.infer<typeof apiTokenSchema>
export type CreateApiTokenInput = z.infer<typeof createApiTokenInputSchema>
