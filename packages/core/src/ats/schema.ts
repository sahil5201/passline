import { toJSONSchema } from "zod"
import { atsAnalysisOutputSchema } from "../schemas/ats-result"

/** JSON Schema for the AI-required ATS analysis output (strict validation on save). */
export const atsAnalysisOutputJsonSchema = toJSONSchema(atsAnalysisOutputSchema, {
  target: "draft-07",
}) as Record<string, unknown>
