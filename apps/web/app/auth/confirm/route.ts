
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host") ?? url.host}`

    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const next = url.searchParams.get("next") ?? "/update-password";

    const safeNext =
        next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/update-password";

    if (!tokenHash || type !== "recovery") {
        return NextResponse.redirect(
            new URL("/forgot-password?error=invalid_link", siteUrl)
        );
    }

    const response = NextResponse.redirect(
        new URL(safeNext, siteUrl)
    );

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
    });

    if (error) {
        console.error("Recovery verification failed:", error.message);

        const errorResponse = NextResponse.redirect(
            new URL(
                "/forgot-password?error=invalid_or_expired_link",
                siteUrl
            )
        );

        // The verification failed; don't issue a recovery session.
        return errorResponse;
    }

    if (!data.session) {
        console.error("Recovery verification returned no session.");

        return NextResponse.redirect(
            new URL("/forgot-password?error=no_session", siteUrl)
        );
    }

    return response;
}
