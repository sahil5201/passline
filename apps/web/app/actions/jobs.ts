"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { JobService, LIMITS } from "@passline/core"
import { requireUser } from "@/lib/session"

function revalidateJobs(id?: string) {
  revalidatePath("/jobs")
  revalidatePath("/tracker")
  revalidatePath("/")
  if (id) revalidatePath(`/jobs/${id}`)
}

export async function createJobAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const title = String(formData.get("title") ?? "").trim()
  const company = String(formData.get("company") ?? "").trim() || null
  const job_url = String(formData.get("job_url") ?? "").trim() || null
  const role = String(formData.get("role") ?? "").trim() || null
  const industry = String(formData.get("industry") ?? "").trim() || null
  const jd_text = String(formData.get("jd_text") ?? "")
  const notes = String(formData.get("notes") ?? "").trim() || null
  const queued = formData.get("queued") === "on"
  const date_added = String(formData.get("date_added") ?? "") || undefined
  const date_applied = String(formData.get("date_applied") ?? "").trim() || null

  if (!title) throw new Error("Title is required")
  if (!jd_text.trim()) throw new Error("Job description is required")
  if (jd_text.length > LIMITS.maxJdLength) {
    throw new Error(`JD must be ≤ ${LIMITS.maxJdLength} characters`)
  }

  const service = new JobService(supabase, user.id)
  const job = await service.create({
    title,
    company,
    job_url,
    role,
    industry,
    jd_text,
    notes,
    date_added,
    date_applied,
    status: queued ? "queued" : "saved",
  })

  revalidateJobs(job.id)
  redirect(`/jobs/${job.id}`)
}

export async function updateJobAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const company = String(formData.get("company") ?? "").trim() || null
  const jobUrlRaw = String(formData.get("job_url") ?? "").trim()
  const role = String(formData.get("role") ?? "").trim() || null
  const industry = String(formData.get("industry") ?? "").trim() || null
  const jd_text = String(formData.get("jd_text") ?? "")
  const notes = String(formData.get("notes") ?? "").trim() || null
  const date_added = String(formData.get("date_added") ?? "") || undefined
  const date_applied = String(formData.get("date_applied") ?? "").trim() || null

  const service = new JobService(supabase, user.id)
  await service.update(id, {
    title,
    company,
    job_url: jobUrlRaw || null,
    role,
    industry,
    jd_text,
    notes,
    date_added,
    date_applied,
  })
  revalidateJobs(id)
}

export async function toggleQueueJobAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const queued = formData.get("queued") === "true" || formData.get("queued") === "on"
  const service = new JobService(supabase, user.id)
  await service.setQueued(id, queued)
  revalidateJobs(id)
}

export async function deleteJobAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const service = new JobService(supabase, user.id)
  await service.delete(id)
  revalidateJobs()
}
