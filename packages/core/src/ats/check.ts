import {
  buildAtsRefinementPrompt,
  buildAtsToolInstructions,
  getRequiredOutputSchema,
} from "./prompt"
import { RUBRIC_VERSION } from "./rubric"
import type { JobRow } from "../services/jobs"
import type { ResumeRow } from "../services/resumes"

/**
 * Shared payload builder for check_ats_compatibility and run_bulk_ats_check.
 * MCP tools assemble this after loading resume/job via services.
 */
export function buildAtsCheckPayload(opts: {
  resume: ResumeRow
  job?: Pick<
    JobRow,
    "id" | "title" | "company" | "jd_text" | "role" | "industry"
  > | null
  jdText?: string
  role?: string | null
  industry?: string | null
}) {
  const jdText = opts.job?.jd_text ?? opts.jdText
  if (!jdText) {
    throw new Error("jd_text or job is required")
  }

  const role = opts.role ?? opts.job?.role ?? null
  const industry = opts.industry ?? opts.job?.industry ?? null

  return {
    resume: {
      id: opts.resume.id,
      label: opts.resume.label,
      text: opts.resume.extracted_text,
    },
    job: {
      id: opts.job?.id ?? null,
      title: opts.job?.title ?? null,
      company: opts.job?.company ?? null,
      jd_text: jdText,
      role,
      industry,
    },
    rubric_version: RUBRIC_VERSION,
    ats_prompt: buildAtsRefinementPrompt({
      resumeText: opts.resume.extracted_text,
      jdText,
      role,
      industry,
      resumeLabel: opts.resume.label,
    }),
    required_output_schema: getRequiredOutputSchema(),
    instructions: buildAtsToolInstructions(),
  }
}
