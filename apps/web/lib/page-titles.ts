// lib/page-titles.ts

export const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/resumes": "Resumes",
    "/resumes/*": "Edit Resume",
    "/jobs": "Jobs",
    "/jobs/*": "Job ATS result",
    "/jobs/new": "Create Job",
    "/tracker":"Tracker",
    "/settings": "Settings",
};

export function getTitle(pathname: string) {
    for (const [route, title] of Object.entries(pageTitles)) {
        if (route.endsWith("/*")) {
            const prefix = route.slice(0, -2);

            if (pathname.startsWith(`${prefix}/`)) {
                return title;
            }
        } else if (pathname === route) {
            return title;
        }
    }

    return "";
}