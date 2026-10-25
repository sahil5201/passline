import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  buildAtsCheckPayload,
  buildAtsRefinementPrompt,
  buildAtsToolInstructions,
  checkAtsCompatibilityInputSchema,
  checkAtsCompatibilityOutputSchema,
  getRequiredOutputSchema,
  getResumeInputSchema,
  getResumeOutputSchema,
  JobService,
  LIMITS,
  listPendingJobsInputSchema,
  listPendingJobsOutputSchema,
  listResumesInputSchema,
  listResumesOutputSchema,
  ResultsService,
  ResumeService,
  RUBRIC_VERSION,
  runBulkAtsCheckInputSchema,
  runBulkAtsCheckOutputSchema,
  saveAtsResultInputSchema,
  saveAtsResultOutputSchema,
  setActiveResumeInputSchema,
  setActiveResumeOutputSchema,
  updateApplicationStatusInputSchema,
  updateApplicationStatusOutputSchema,
  type PasslineSupabase,
} from "@passline/core"
import { toolError, toolSuccess } from "./respond"
import { resolveResumeStoragePath } from "./storage-path"
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server"
const atsResultHtml = await Bun.file(
  new URL("./ui/ats-result.html", import.meta.url),
).text();
const html = atsResultHtml.replace(
  "__DASHBOARD_URL__",
  process.env.DASHBOARD_URL ?? "http://localhost:3000",
)
const ATS_UI_URI = "ui://ats/result.html"

export const MCP_TOOLS = [
  "list_resumes",
  "get_resume",
  "set_active_resume",
  "check_ats_compatibility",
  "save_ats_result",
  "list_pending_jobs",
  "run_bulk_ats_check",
  "update_application_status",
] as const

/** @deprecated use MCP_TOOLS */
export const MCP_V1_TOOLS = MCP_TOOLS

/** Register all planned MCP tools for the authenticated user. */
export function registerMcpTools(
  server: McpServer,
  db: PasslineSupabase,
  userId: string,
): void {
  const resumes = new ResumeService(db, userId)
  const jobs = new JobService(db, userId)
  const results = new ResultsService(db, userId)

  server.registerTool(
    "list_resumes",
    {
      title: "List resumes",
      description:
        "List the user's resume versions (id, label, active flag, file type, version, updated date).",
      inputSchema: listResumesInputSchema,
      outputSchema: listResumesOutputSchema,
    },
    async () => {
      try {
        return toolSuccess({ resumes: await resumes.list() })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    "get_resume",
    {
      title: "Get resume",
      description:
        'Return the active resume as Markdown/text by default. Pass resume_id for a specific version. Use format "original" for a short-lived signed URL.',
      inputSchema: getResumeInputSchema,
      outputSchema: getResumeOutputSchema,
    },
    async (args) => {
      try {
        const input = getResumeInputSchema.parse(args)
        const resume = await resumes.getActiveOrById(input.resume_id)

        if (input.format === "original") {
          const path = resolveResumeStoragePath(resume, userId)
          if (!path) {
            return toolError(
              new Error(
                'No original file for this resume (pasted text only). Use format "text".',
              ),
            )
          }
          const signedUrl = await resumes.createSignedUrl(path)
          return toolSuccess({
            resume_id: resume.id,
            label: resume.label,
            is_active: resume.is_active,
            file_type: resume.file_type,
            format: "original" as const,
            signed_url: signedUrl,
            signed_url_expires_in_seconds: LIMITS.signedUrlExpiresInSeconds,
          })
        }

        return toolSuccess({
          resume_id: resume.id,
          label: resume.label,
          is_active: resume.is_active,
          file_type: resume.file_type,
          format: "text" as const,
          text: resume.extracted_text,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    "set_active_resume",
    {
      title: "Set active resume",
      description: "Switch which resume version is active for subsequent ATS checks.",
      inputSchema: setActiveResumeInputSchema,
      outputSchema: setActiveResumeOutputSchema,
    },
    async (args) => {
      try {
        const input = setActiveResumeInputSchema.parse(args)
        const resume = await resumes.setActive(input.resume_id)
        return toolSuccess({
          resume_id: resume.id,
          label: resume.label,
          is_active: true as const,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    "check_ats_compatibility",
    {
      title: "Check ATS compatibility",
      description:
        "Return resume + JD + ATS refinement prompt + required JSON output schema. Provide jd_text or job_id. After analysis, call save_ats_result.",
      inputSchema: checkAtsCompatibilityInputSchema,
      outputSchema: checkAtsCompatibilityOutputSchema,
    },
    async (args) => {
      try {
        const input = checkAtsCompatibilityInputSchema.parse(args)
        const resume = await resumes.getActiveOrById(input.resume_id)
        const job = input.job_id ? await jobs.getById(input.job_id) : null
        return toolSuccess(
          buildAtsCheckPayload({
            resume,
            job,
            jdText: input.jd_text,
            role: input.role,
            industry: input.industry,
          }),
        )
      } catch (err) {
        return toolError(err)
      }
    },
  )

  // server.registerTool(
  //   "save_ats_result",
  //   {
  //     title: "Save ATS result",
  //     description:
  //       "Validate and store an AI-generated ATS analysis. Provide job_id or jd_text. Marks the job as analyzed.",
  //     inputSchema: saveAtsResultInputSchema,
  //     outputSchema: saveAtsResultOutputSchema,
  //     _meta: { ui: { resourceUri: ATS_UI_URI } },
  //   },
  //   async (args) => {
  //     try {
  //       const input = saveAtsResultInputSchema.parse(args)
  //       const saved = await results.saveAtsResult(input)
  //       return toolSuccess({
  //         result_id: saved.result.id,
  //         job_id: saved.job_id,
  //         resume_id: saved.resume_id,
  //         score: Number(saved.result.score),
  //         status: "analyzed" as const,
  //       })
  //     } catch (err) {
  //       return toolError(err)
  //     }
  //   },
  // )

  const kw = (list: unknown): string[] =>
    (Array.isArray(list) ? list : [])
      .map((k) => (typeof k === "string" ? k : (k as any)?.keyword ?? (k as any)?.name))
      .filter((k): k is string => typeof k === "string" && k.length > 0)

  registerAppTool(
    server,
    "save_ats_result",
    {
      title: "Save ATS result",
      description:
        "Validate and store an AI-generated ATS analysis. Provide job_id or jd_text. Marks the job as analyzed. Displays the score card.",
      inputSchema: saveAtsResultInputSchema,
      outputSchema: saveAtsResultOutputSchema, // must now include the card fields
      _meta: { ui: { resourceUri: ATS_UI_URI } },
    },
    async (args: any) => {
      try {
        const input: any = saveAtsResultInputSchema.parse(args)
        const saved = await results.saveAtsResult(input)
        const r = input.result

        return toolSuccess({
          result_id: saved.result.id,
          job_id: saved.job_id,
          resume_id: saved.resume_id,
          score: Number(saved.result.score),
          status: "analyzed" as const,
          matched_keywords: r.matched_keywords,
          missing_keywords: r.missing_keywords,
          section_feedback: r.section_feedback,
          formatting_issues: r.formatting_issues,
          suggested_changes: r.suggested_changes,
        })
      } catch (err) {
        return toolError(err)
      }
    }
  )

  registerAppResource(
    server,
    "ATS result card",
    ATS_UI_URI,
    { _meta: { ui: {} } },
    async () => ({
      contents: [
        { uri: ATS_UI_URI, mimeType: RESOURCE_MIME_TYPE, text: html },
      ],
    }),
  )

  server.registerTool(
    "list_pending_jobs",
    {
      title: "List pending jobs",
      description: "List jobs with status queued (ready for bulk ATS check).",
      inputSchema: listPendingJobsInputSchema,
      outputSchema: listPendingJobsOutputSchema,
    },
    async () => {
      try {
        const queued = await jobs.listQueued()
        return toolSuccess({
          jobs: queued.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            role: j.role,
            industry: j.industry,
            status: "queued" as const,
            date_added: j.date_added,
          })),
          count: queued.length,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    "run_bulk_ats_check",
    {
      title: "Run bulk ATS check",
      description:
        "Return up to 5 queued jobs plus the active resume, ATS prompt, and remaining_count. Analyze each job and call save_ats_result. If remaining_count > 0, run again.",
      inputSchema: runBulkAtsCheckInputSchema,
      outputSchema: runBulkAtsCheckOutputSchema,
    },
    async (args) => {
      try {
        const input = runBulkAtsCheckInputSchema.parse(args)
        const resume = await resumes.getActiveOrById(input.resume_id)
        const { jobs: batch, remaining_count } = await jobs.listQueuedBatch(
          input.limit ?? LIMITS.bulkAtsMaxJobs,
        )

        const sharedPrompt = buildAtsRefinementPrompt({
          resumeText: resume.extracted_text,
          jdText:
            "{{JOB_DESCRIPTION — use each job.jd_text from the jobs array; do not invent JDs}}",
          role: null,
          industry: null,
          resumeLabel: resume.label,
        })

        return toolSuccess({
          resume: {
            id: resume.id,
            label: resume.label,
            text: resume.extracted_text,
          },
          jobs: batch.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            jd_text: j.jd_text,
            role: j.role,
            industry: j.industry,
          })),
          returned_count: batch.length,
          remaining_count,
          rubric_version: RUBRIC_VERSION,
          ats_prompt: [
            sharedPrompt,
            "",
            "Bulk mode: for EACH job in the jobs array, substitute that job's jd_text (and role/industry) into your analysis.",
            "Call save_ats_result once per job with that job's id.",
            remaining_count > 0
              ? `After finishing this batch, tell the user ${remaining_count} queued job(s) remain and to run run_bulk_ats_check again.`
              : "This batch clears the current queue slice.",
          ].join("\n"),
          required_output_schema: getRequiredOutputSchema(),
          instructions: buildAtsToolInstructions(),
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    "update_application_status",
    {
      title: "Update application status",
      description:
        "Mark whether the user applied with ATS changes and/or heard back (none, no_response, interview, offer, rejected).",
      inputSchema: updateApplicationStatusInputSchema,
      outputSchema: updateApplicationStatusOutputSchema,
    },
    async (args) => {
      try {
        const input = updateApplicationStatusInputSchema.parse(args)
        const row = await results.upsertApplicationTracking(input)
        return toolSuccess({
          job_id: row.job_id,
          applied_with_ats_changes: row.applied_with_ats_changes,
          heard_back: row.heard_back,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )
}

/** @deprecated use registerMcpTools */
export const registerMcpV1Tools = registerMcpTools
