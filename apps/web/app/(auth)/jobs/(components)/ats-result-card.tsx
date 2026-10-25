import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SuggestedChange =
  | string
  | {
      section?: string
      original?: string
      suggested?: string
      rationale?: string
    }

export type AtsResultView = {
  score: number
  rubric_version: string
  model_used?: string | null
  created_at: string
  // Supabase types these jsonb columns as `Json`, so accept anything and
  // normalize below instead of trusting the shape.
  matched_keywords?: unknown
  missing_keywords?: unknown
  section_feedback?: unknown
  formatting_issues?: unknown
  suggested_changes?: unknown
}

const RING_R = 36
const RING_C = 2 * Math.PI * RING_R

function toStrings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : []
}

function toRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {}
  return Object.fromEntries(
    Object.entries(v).filter(([, x]) => typeof x === "string"),
  ) as Record<string, string>
}

function toChanges(v: unknown): SuggestedChange[] {
  if (!Array.isArray(v)) return []
  return v.filter(
    (x) =>
      typeof x === "string" ||
      (x !== null && typeof x === "object" && !Array.isArray(x)),
  ) as SuggestedChange[]
}

function headlineFor(score: number) {
  if (score >= 85) return "Strong match"
  if (score >= 70) return "Good match, a few gaps to close"
  if (score >= 50) return "Partial match, needs work"
  return "Weak match"
}

function Chips({ items, tone }: { items: string[]; tone: "warn" | "good" }) {
  const cls =
    tone === "warn"
      ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span key={k} className={`rounded-full px-2.5 py-[3px] text-[13px] ${cls}`}>
          {k}
        </span>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
      {children}
    </div>
  )
}

export function AtsResultCard({ latest }: { latest: AtsResultView }) {
  const score = Math.max(0, Math.min(100, Math.round(Number(latest.score) || 0)))
  const matched = toStrings(latest.matched_keywords)
  const missing = toStrings(latest.missing_keywords)
  const formatting = toStrings(latest.formatting_issues)
  const feedback = Object.entries(toRecord(latest.section_feedback))
  const suggested = toChanges(latest.suggested_changes)
  const total = matched.length + missing.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest ATS result</CardTitle>
        <CardDescription>
          Rubric {latest.rubric_version}
          {latest.model_used ? ` · Model ${latest.model_used}` : ""}
          {" · "}
          {new Date(latest.created_at).toLocaleString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* Score */}
        <div className="flex items-center gap-4 border-b pb-3.5">
          <div className="relative h-[84px] w-[84px] flex-none" aria-hidden="true">
            <svg
              width="84"
              height="84"
              viewBox="0 0 84 84"
              fill="none"
              strokeWidth={8}
              className="-rotate-90"
            >
              <circle
                cx="42"
                cy="42"
                r={RING_R}
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <circle
                cx="42"
                cy="42"
                r={RING_R}
                strokeLinecap="round"
                className="stroke-emerald-600 transition-[stroke-dashoffset] duration-700 dark:stroke-emerald-400"
                style={{
                  strokeDasharray: RING_C,
                  strokeDashoffset: RING_C * (1 - score / 100),
                }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[26px] font-bold">
              {score}
            </span>
          </div>
          <div>
            <strong className="block text-base">{headlineFor(score)}</strong>
            {total > 0 ? (
              <small className="text-sm text-muted-foreground">
                {matched.length} of {total} required keywords found
              </small>
            ) : null}
          </div>
        </div>

        {/* Keywords */}
        {missing.length ? (
          <div>
            <Label>Missing from your resume</Label>
            <Chips items={missing} tone="warn" />
          </div>
        ) : null}
        {matched.length ? (
          <div>
            <Label>Found</Label>
            <Chips items={matched} tone="good" />
          </div>
        ) : null}

        {/* Formatting issues */}
        {formatting.length ? (
          <div className="space-y-2">
            {formatting.map((item) => (
              <p
                key={item}
                className="border-l-[3px] border-blue-600 pl-3 leading-snug text-muted-foreground dark:border-blue-400"
              >
                <b className="font-semibold text-foreground">Formatting issue: </b>
                {item}
              </p>
            ))}
          </div>
        ) : null}

        {/* Section feedback */}
        {feedback.length ? (
          <div>
            <Label>Section feedback</Label>
            <div className="space-y-2">
              {feedback.map(([section, text]) => (
                <p key={section} className="leading-snug text-muted-foreground">
                  <b className="font-semibold capitalize text-foreground">
                    {section.replace(/_/g, " ")}:{" "}
                  </b>
                  {text}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {/* Suggested changes */}
        {suggested.length ? (
          <div>
            <Label>Suggested changes</Label>
            <div className="grid gap-3">
              {suggested.map((s, i) => {
                const item = typeof s === "string" ? { suggested: s } : s
                return (
                  <div key={i} className="grid gap-2.5 rounded-xl border p-3">
                    {item.section ? (
                      <div className="text-sm font-bold">{item.section}</div>
                    ) : null}

                    {item.original ? (
                      <div className="break-words rounded-lg border-l-4 border-orange-600 bg-orange-50 px-3 py-2.5 leading-normal text-orange-900 dark:border-orange-400 dark:bg-orange-950/50 dark:text-orange-200">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-85">
                          Original
                        </span>
                        {item.original}
                      </div>
                    ) : null}

                    {item.suggested ? (
                      <div className="break-words rounded-lg border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2.5 leading-normal text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-85">
                          Suggested
                        </span>
                        {item.suggested}
                      </div>
                    ) : null}

                    {item.rationale ? (
                      <p className="text-[13px] leading-normal text-muted-foreground">
                        <b className="font-semibold text-foreground">Why: </b>
                        {item.rationale}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}