import { LoginForm } from "@/components/login-form"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login | Passline",
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string, authorization_id?: string }>
}) {
  const params = await searchParams
  const next = params.authorization_id
    ? `/oauth/consent?authorization_id=${encodeURIComponent(
      params.authorization_id
    )}`
    : params.next || "/"
    
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <LoginForm
          next={next || "/"}
          error={params.error}
          message={params.message}
        />
      </div>
    </div>
  )
}
