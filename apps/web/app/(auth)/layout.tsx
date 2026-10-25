import { AppShell } from '@/components/app-shell'
import React from 'react'
import { toNavUser } from "@/lib/user-display"
import { requireUser } from '@/lib/session'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: "Dashboard | PassLine",
    template: "%s | PassLine",
  },
};

async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user } = await requireUser()
    return (
        <AppShell user={toNavUser(user)}>
            {children}
        </AppShell>
    )
}

export default AuthLayout