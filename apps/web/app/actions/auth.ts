"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "/") || "/"

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  redirect(next.startsWith("/") ? next : "/")
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }
  redirect("/login?message=Check your email to confirm, then sign in.")
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const next = String(formData.get("next") ?? "/") || "/"

  const supabase = await createClient()

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/confirm`,
  })

  if (error) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    )
  }

  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "If an account exists for that email, you will receive a password reset link shortly."
    )}&next=${encodeURIComponent(next)}`
  )
}


export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  )

  if (password.length < 8) {
    redirect("/update-password?error=Password+must+be+at+least+8+characters")
  }

  if (password !== confirmPassword) {
    redirect("/update-password?error=Passwords+do+not+match")
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/forgot-password?error=Please+request+a+new+reset+link")
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(
      `/update-password?error=${encodeURIComponent(error.message)}`
    )
  }

  await supabase.auth.signOut()
  redirect("/login?message=Password+updated+successfully")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
