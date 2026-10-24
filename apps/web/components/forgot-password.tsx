"use client";
import { resetPassword } from "@/app/actions/auth";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ResendResetButton } from "./resend-reset-button";
import { useState } from "react";

export function ForgotPassword({
    className,
    next = "/",
    error,
    message,
    ...props
}: React.ComponentProps<"div"> & {
    next?: string
    error?: string
    message?: string
}) {
    const [email, setEmail] = useState('')
    if (message) {
        return <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Check your email</CardTitle>
                    <CardDescription>
                        {`We sent a reset link to your email.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center mx-auto mb-2.5">
                        <CheckCircle2 className="size-16" />
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">{message}</p>
                    <ResendResetButton email={email} />
                    <FieldDescription className="text-center">
                        Please log in with your new password.
                       &nbsp;<Link href="/login" className="underline-offset-4 hover:underline">
                            Login
                        </Link>
                    </FieldDescription>
                </CardContent>
            </Card>
        </div>
    }
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Forgot your password?</CardTitle>
                    <CardDescription>
                        {`Enter your email address, and we'll send you a password reset link.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="mb-4 text-sm text-destructive">{error}</p>
                    ) : null}
                    <form action={resetPassword}>
                        <input type="hidden" name="next" value={next} />
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.currentTarget.value)}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" className="w-full">
                                    Send Reset Link
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}