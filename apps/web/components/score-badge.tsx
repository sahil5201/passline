import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined
  className?: string
}) {
  if (score == null || Number.isNaN(score)) {
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        —
      </Badge>
    )
  }

  const value = Math.round(Number(score))
  const tone =
    value >= 75
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : value >= 50
        ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"

  return (
    <Badge variant="outline" className={cn("font-medium tabular-nums", tone, className)}>
      {value}
    </Badge>
  )
}
