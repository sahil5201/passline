"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { resetPassword } from "@/app/actions/auth"

const COOLDOWN_SECONDS = 120
const STORAGE_KEY = "reset-resend-available-at"

function getRemaining(): number {
    try {
        const availableAt = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0)
        return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000))
    } catch {
        return 0
    }
}

function startCooldown() {
    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            String(Date.now() + COOLDOWN_SECONDS * 1000)
        )
    } catch { }
}

export function ResendResetButton({ email }: { email: string }) {
    // Start at full cooldown: the first email was just sent
    const [remaining, setRemaining] = useState(COOLDOWN_SECONDS)
    const [isPending, startTransition] = useTransition()
    const [status, setStatus] = useState<string | null>(null)

    // On mount: start (or resume) the cooldown
    useEffect(() => {
        if (getRemaining() === 0) startCooldown()
        setRemaining(getRemaining())
    }, [])

    // Tick every second
    useEffect(() => {
        if (remaining <= 0) return
        const id = setInterval(() => setRemaining(getRemaining()), 1000)
        return () => clearInterval(id)
    }, [remaining])

    function handleResend() {
        setStatus(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.set("email", email)
            await resetPassword(formData) // adjust to your action's signature
            startCooldown()
            setRemaining(getRemaining())
            setStatus("A new reset link has been sent.")
        })
    }

    const mm = String(Math.floor(remaining / 60)).padStart(1, "0")
    const ss = String(remaining % 60).padStart(2, "0")

    return (
        <div className="flex flex-col items-center gap-2">
            <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={remaining > 0 || isPending}
            >
                {isPending
                    ? "Sending..."
                    : remaining > 0
                        ? `Resend link in ${mm}:${ss}`
                        : "Resend reset link"}
            </Button>
            {status && (
                <p className="text-sm text-muted-foreground" role="status">
                    {status}
                </p>
            )}
        </div>
    )
}