import { ForgotPassword } from "@/components/forgot-password";
// Forgot your password?
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot your password? | Passline",
};
export default async function ForgotPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
            <div className="w-full max-w-sm">
                <ForgotPassword
                    next={params.next || "/"}
                    error={params.error}
                    message={params.message}
                />
            </div>
        </div>
    )
}