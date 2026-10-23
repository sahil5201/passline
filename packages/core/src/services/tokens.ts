import { createHash, randomBytes } from "node:crypto"
import type { Tables } from "@passline/db"
import type { CreateApiTokenInput } from "../schemas/api-token"
import type { PasslineSupabase } from "./client"
import { assertUserId, ServiceError } from "./errors"

export type ApiTokenRow = Tables<"api_tokens">

/** Public view — never includes token_hash. */
export type ApiTokenPublic = Omit<ApiTokenRow, "token_hash">

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

function toPublic(row: ApiTokenRow): ApiTokenPublic {
  const { token_hash: _, ...rest } = row
  return rest
}

/**
 * Personal API tokens for MCP auth.
 * Raw token shown once; only SHA-256 hash is stored.
 */
export class TokenService {
  constructor(
    private readonly db: PasslineSupabase,
    private readonly userId: string,
  ) {
    assertUserId(userId)
  }

  async list(): Promise<ApiTokenPublic[]> {
    const { data, error } = await this.db
      .from("api_tokens")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return (data ?? []).map(toPublic)
  }

  async create(
    input: CreateApiTokenInput,
  ): Promise<{ token: string; record: ApiTokenPublic }> {
    const raw = `pln_${randomBytes(32).toString("base64url")}`
    const prefix = raw.slice(0, 12)
    const token_hash = hashToken(raw)

    const { data, error } = await this.db
      .from("api_tokens")
      .insert({
        user_id: this.userId,
        name: input.name,
        token_hash,
        prefix,
      })
      .select("*")
      .single()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    return { token: raw, record: toPublic(data) }
  }

  async revoke(tokenId: string): Promise<ApiTokenPublic> {
    const { data, error } = await this.db
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", this.userId)
      .eq("id", tokenId)
      .is("revoked_at", null)
      .select("*")
      .maybeSingle()

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    if (!data) throw new ServiceError("NOT_FOUND", "Token not found", 404)
    return toPublic(data)
  }

  async delete(tokenId: string): Promise<void> {
    const { error, count } = await this.db
      .from("api_tokens")
      .delete({ count: "exact" })
      .eq("user_id", this.userId)
      .eq("id", tokenId)

    if (error) throw new ServiceError("DB_ERROR", error.message, 500)
    if (!count) throw new ServiceError("NOT_FOUND", "Token not found", 404)
  }
}

/**
 * Resolve a Bearer token to user_id (MCP middleware).
 * Uses service-role client; does not require a prior userId.
 */
export async function authenticateApiToken(
  db: PasslineSupabase,
  rawToken: string,
): Promise<{ userId: string; tokenId: string }> {
  if (!rawToken?.startsWith("pln_")) {
    throw new ServiceError("UNAUTHORIZED", "Invalid API token", 401)
  }

  const token_hash = hashToken(rawToken)
  const { data, error } = await db
    .from("api_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle()

  if (error) throw new ServiceError("DB_ERROR", error.message, 500)
  if (!data || data.revoked_at) {
    throw new ServiceError("UNAUTHORIZED", "Invalid or revoked API token", 401)
  }

  // Fire-and-forget last_used_at update
  void db
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)

  return { userId: data.user_id, tokenId: data.id }
}
