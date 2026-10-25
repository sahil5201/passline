import z from "zod";

// ats-result schema (put this in the output schema of save_ats_result)
export const atsResultSchema = z.object({
  score: z.number().min(0).max(100),               // 78
  headline: z.string(),                            // "Good match, a few gaps to close"
  keywords_found_count: z.number(),                // 14
  keywords_required_count: z.number(),             // 19
  missing_keywords: z.array(z.string()),           // ["Kubernetes", "gRPC", "Terraform"]
  found_keywords: z.array(z.string()),             // ["Go", "PostgreSQL", ...]
  parsing_issues: z.array(z.string()),             // "Your Skills section uses two columns..."
})