import { LIMITS } from "@passline/core"

type Bucket = {
  minute: number[]
  day: number[]
}

const buckets = new Map<string, Bucket>()

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs)
}

/**
 * Simple in-memory per-user rate limit (plan §8 / §10).
 * Resets on process restart; not shared across instances.
 */
export function checkRateLimit(userId: string): {
  allowed: boolean
  retryAfterSeconds?: number
  reason?: string
} {
  const now = Date.now()
  const bucket = buckets.get(userId) ?? { minute: [], day: [] }

  bucket.minute = prune(bucket.minute, 60_000, now)
  bucket.day = prune(bucket.day, 86_400_000, now)

  if (bucket.minute.length >= LIMITS.mcpRateLimitPerMinute) {
    const oldest = bucket.minute[0]!
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((60_000 - (now - oldest)) / 1000),
      reason: `Rate limit exceeded: max ${LIMITS.mcpRateLimitPerMinute} MCP requests per minute`,
    }
  }

  if (bucket.day.length >= LIMITS.mcpRateLimitPerDay) {
    const oldest = bucket.day[0]!
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((86_400_000 - (now - oldest)) / 1000),
      reason: `Rate limit exceeded: max ${LIMITS.mcpRateLimitPerDay} MCP requests per day`,
    }
  }

  bucket.minute.push(now)
  bucket.day.push(now)
  buckets.set(userId, bucket)
  return { allowed: true }
}
