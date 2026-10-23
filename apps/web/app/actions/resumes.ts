"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ResumeFileType } from "@passline/db"
import {
  LIMITS,
  RESUME_STORAGE_BUCKET,
  ResumeService,
  extractResumeText,
  extensionToFileType,
  normalizePastedText,
} from "@passline/core"
import { requireUser } from "@/lib/session"

function revalidateResumes(id?: string) {
  revalidatePath("/resumes")
  revalidatePath("/")
  if (id) revalidatePath(`/resumes/${id}`)
}

export async function uploadResumeAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const label = String(formData.get("label") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim() || null
  const setActive = formData.get("set_active") === "on"
  const file = formData.get("file")

  if (!label) throw new Error("Label is required")
  if (!(file instanceof File) || file.size === 0) throw new Error("File is required")
  if (file.size > LIMITS.maxResumeFileBytes) {
    throw new Error(`File exceeds ${LIMITS.maxResumeFileBytes / (1024 * 1024)} MB limit`)
  }

  const fileType = extensionToFileType(file.name)
  if (!fileType) throw new Error("Unsupported file type. Use PDF, DOC, DOCX, MD, or TXT.")

  const bytes = new Uint8Array(await file.arrayBuffer())
  const extracted = await extractResumeText(bytes, fileType)

  const service = new ResumeService(supabase, user.id)
  const resume = await service.create({
    label,
    file_type: fileType,
    extracted_text: extracted.text,
    notes,
    set_active: setActive,
  })

  const path = service.storagePath(resume.id, fileType)
  const { error: uploadError } = await supabase.storage
    .from(RESUME_STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) throw new Error(uploadError.message)

  const { error } = await supabase
    .from("resumes")
    .update({ original_file_url: path })
    .eq("id", resume.id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)

  revalidateResumes(resume.id)
  redirect(`/resumes/${resume.id}`)
}

export async function pasteResumeAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const label = String(formData.get("label") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim() || null
  const setActive = formData.get("set_active") === "on"
  const text = String(formData.get("text") ?? "")
  const { text: extracted } = normalizePastedText(text)

  if (!label) throw new Error("Label is required")
  if (!extracted) throw new Error("Pasted text is required")

  const service = new ResumeService(supabase, user.id)
  const resume = await service.create({
    label,
    file_type: "paste" satisfies ResumeFileType,
    extracted_text: extracted,
    notes,
    set_active: setActive,
  })

  revalidateResumes(resume.id)
  redirect(`/resumes/${resume.id}`)
}

export async function updateResumeAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const label = String(formData.get("label") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim() || null
  const extracted_text = String(formData.get("extracted_text") ?? "")

  const service = new ResumeService(supabase, user.id)
  await service.update(id, { label, notes, extracted_text })
  revalidateResumes(id)
}

export async function setActiveResumeAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const service = new ResumeService(supabase, user.id)
  await service.setActive(id)
  revalidateResumes(id)
}

export async function deleteResumeAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const service = new ResumeService(supabase, user.id)
  const resume = await service.getById(id)

  if (resume.original_file_url?.startsWith(`${user.id}/`)) {
    await supabase.storage
      .from(RESUME_STORAGE_BUCKET)
      .remove([resume.original_file_url])
  }

  await service.delete(id)
  revalidateResumes()
}
