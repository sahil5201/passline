/** Versioned ATS scoring rubric (plan §7). Bump RUBRIC_VERSION on any weight/rule change. */

export const RUBRIC_VERSION = "2026.03.1" as const

export const RUBRIC_CATEGORIES = [
  {
    id: "keyword_skills_match",
    label: "Keyword/skills match",
    weight: 0.35,
    guidance:
      "How well the resume reflects explicit skills, tools, and keywords from the JD.",
  },
  {
    id: "title_experience_alignment",
    label: "Job title and experience alignment",
    weight: 0.2,
    guidance:
      "Seniority, role title proximity, and relevant years/scope of experience.",
  },
  {
    id: "formatting_parseability",
    label: "Formatting and parseability",
    weight: 0.2,
    guidance:
      "Standard headings, single-column layout, no tables/columns/graphics that break ATS parsers.",
  },
  {
    id: "section_completeness_impact",
    label: "Section completeness and quantified impact",
    weight: 0.15,
    guidance:
      "Presence of expected sections and measurable outcomes (metrics, scope, results).",
  },
  {
    id: "role_industry_fit",
    label: "Role/industry-specific fit",
    weight: 0.1,
    guidance:
      "Domain language, compliance, stack, or industry signals when role/industry is provided.",
  },
] as const

export type RubricCategoryId = (typeof RUBRIC_CATEGORIES)[number]["id"]

export function formatRubricForPrompt(): string {
  const lines = RUBRIC_CATEGORIES.map(
    (c) =>
      `- ${c.label} (${Math.round(c.weight * 100)}%): ${c.guidance}`,
  )
  return [
    `Rubric version: ${RUBRIC_VERSION}`,
    "Score 0–100 using these weighted categories:",
    ...lines,
    "Compute an overall score as the weighted sum of category assessments (each 0–100).",
  ].join("\n")
}
