"use server"

import { revalidatePath } from "next/cache"
import { ResultsService, type UpdateApplicationStatusInput } from "@passline/core"
import { requireUser } from "@/lib/session"

export async function updateSurveyAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const job_id = String(formData.get("job_id") ?? "")
  const appliedRaw = formData.get("applied_with_ats_changes")
  const heard_back = String(formData.get("heard_back") ?? "none") as UpdateApplicationStatusInput["heard_back"]

  let applied_with_ats_changes: boolean | null = null
  if (appliedRaw === "yes") applied_with_ats_changes = true
  if (appliedRaw === "no") applied_with_ats_changes = false

  const service = new ResultsService(supabase, user.id)
  await service.upsertApplicationTracking({
    job_id,
    applied_with_ats_changes,
    heard_back,
  })

  revalidatePath(`/jobs/${job_id}`)
  revalidatePath("/tracker")
  revalidatePath("/")
}
