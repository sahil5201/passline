import { ForgotPassword } from "@/components/forgot-password";
import ResetPassword from "@/components/reset-password";

export default async function PasswordUpdatePage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
            <div className="w-full max-w-sm">
                <ResetPassword
                    next={params.next || "/"}
                    error={params.error}
                    message={params.message}
                />
            </div>
        </div>
    )
}