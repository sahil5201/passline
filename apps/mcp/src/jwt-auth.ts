import { createRemoteJWKSet, jwtVerify } from "jose"
import { ServiceError } from "@passline/core"

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks(supabaseUrl: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`),
    )
  }
  return jwks
}

/**
 * Validate a Supabase-issued access JWT (Phase 5 OAuth / connector path).
 * Falls back gracefully if JWKS is unavailable.
 */
export async function authenticateSupabaseJwt(
  rawToken: string,
  supabaseUrl: string,
): Promise<{ userId: string }> {
  try {
    const { payload } = await jwtVerify(rawToken, getJwks(supabaseUrl), {
      issuer: `${supabaseUrl.replace(/\/$/, "")}/auth/v1`,
    })

    const sub = payload.sub
    if (!sub || typeof sub !== "string") {
      throw new ServiceError("UNAUTHORIZED", "JWT missing subject", 401)
    }
    return { userId: sub }
  } catch (err) {
    if (err instanceof ServiceError) throw err
    throw new ServiceError("UNAUTHORIZED", "Invalid or expired JWT", 401)
  }
}
