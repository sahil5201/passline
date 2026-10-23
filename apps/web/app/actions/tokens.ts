"use server"

import { revalidatePath } from "next/cache"
import { TokenService } from "@passline/core"
import { requireUser } from "@/lib/session"

export async function createTokenAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("Token name is required")

  const service = new TokenService(supabase, user.id)
  const created = await service.create({ name })
  revalidatePath("/settings")
  revalidatePath("/settings/tokens")
  return { token: created.token, id: created.record.id, prefix: created.record.prefix }
}

export async function revokeTokenAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const service = new TokenService(supabase, user.id)
  await service.revoke(id)
  revalidatePath("/settings")
  revalidatePath("/settings/tokens")
}

export async function deleteTokenAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const service = new TokenService(supabase, user.id)
  await service.delete(id)
  revalidatePath("/settings")
  revalidatePath("/settings/tokens")
}
