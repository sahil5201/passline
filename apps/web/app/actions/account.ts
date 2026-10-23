"use server"

import { redirect } from "next/navigation"
import { AccountService } from "@passline/core"
import { requireUser } from "@/lib/session"

export async function deleteMyDataAction() {
  const { supabase, user } = await requireUser()
  const service = new AccountService(supabase, user.id)
  await service.deleteAllData()
  await supabase.auth.signOut()
  redirect("/login?message=Your data was deleted.")
}
