import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"




export async function GET(request: Request) {
    const url = new URL(request.url)
    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host") ?? url.host}`

    console.log('url.searchParams', url.searchParams)
    const token_hash = url.searchParams.get("token_hash")
    const type = url.searchParams.get("type")
    const next = url.searchParams.get("next") ?? "/update-password"

    const safeNext =
        next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/update-password"

    console.log('token_hash', token_hash)
    console.log('type', type)
    console.log('next', next)
    if (!token_hash || type !== "recovery") {
        return NextResponse.redirect(
            new URL("/forgot-password?error=Invalid+reset+link", siteUrl)
        )
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
    })

    if (error) {
        console.error("Recovery verification failed:", error.message)
        return NextResponse.redirect(
            new URL(
                `/forgot-password?error=${encodeURIComponent(error.message)}`,
                siteUrl
            )
        )
    }

    return NextResponse.redirect(new URL(safeNext, siteUrl))
}