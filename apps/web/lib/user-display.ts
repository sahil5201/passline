import type { User } from "@supabase/supabase-js"

export function toNavUser(user: User) {
  const email = user.email ?? ""
  const name =
    (user.user_metadata?.full_name as string | undefined) ||
    email.split("@")[0] ||
    "User"
  const avatar = (user.user_metadata?.avatar_url as string | undefined) || ""
  return { name, email, avatar }
}
