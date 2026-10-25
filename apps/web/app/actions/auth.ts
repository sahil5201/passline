"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// SignIn function
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "/")

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const params = new URLSearchParams({
      error: error.message,
      next,
    })

    redirect(`/login?${params.toString()}`)
  }

  // Only allow local redirects.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/")
}
// SignIn function end

// SignUp function
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
// SignUp function end

// ResetPassword function
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
// ResetPassword function end

// UpdatePassword function
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
// UpdatePassword function end

// Logout function
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
// Logout function end

// Waitlist function
export async function waitlist(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()

  const rawNext = String(formData.get("next") ?? "/").trim()

  // Allow only local paths to prevent open redirects.
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("\\")
      ? rawNext
      : "/"

  const signupUrl = (params: Record<string, string>) => {
    const query = new URLSearchParams({
      ...params,
      next,
    })

    return `/signup?${query.toString()}`
  }

  // Basic email validation.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || !emailRegex.test(email)) {
    redirect(
      signupUrl({
        error: "Please enter a valid email address.",
      })
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("waitlist")
    .insert({ email })

  if (error) {
    // Log the technical details on the server, not in the URL.
    console.error("Waitlist insert failed:", error.code, error.message)

    // PostgreSQL unique violation: email already exists.
    if (error.code === "23505") {
      redirect(
        signupUrl({
          message: "This email is already on the waitlist.",
        })
      )
    }

    redirect(
      signupUrl({
        error: "Unable to join the waitlist right now. Please try again.",
      })
    )
  }

  redirect(
    signupUrl({
      message: "You have successfully joined the waitlist!",
    })
  )
}
// Waitlist function end

