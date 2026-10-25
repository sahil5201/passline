import { cn } from 'cn'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Field, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { updatePassword } from '@/app/actions/auth'
import { PasswordInput } from './password-input'

function ResetPassword({
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
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Set a new password</CardTitle>
                    <CardDescription>
                        Create a new password. Ensure it differs from previous ones for security.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="mb-4 text-sm text-destructive">{error}</p>
                    ) : null}
                    {message ? (
                        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
                    ) : null}
                    <form
                        action={updatePassword}
                    >
                        <input type="hidden" name="next" value={next} />
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="password">password</FieldLabel>
                                <PasswordInput
                                    id="new-password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                <PasswordInput
                                    id="confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    autoComplete="confirm-password"
                                />
                            </Field>
                            <Field>
                                <Button type="submit" className="w-full">
                                    Update Password
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default ResetPassword