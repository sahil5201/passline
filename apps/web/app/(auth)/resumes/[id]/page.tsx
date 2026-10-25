import Link from "next/link"
import { notFound } from "next/navigation"
import { ResumeService, ServiceError } from "@passline/core"
import { setActiveResumeAction, updateResumeAction } from "@/app/actions/resumes"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { requireUser } from "@/lib/session"
import { toNavUser } from "@/lib/user-display"
import { Fragment } from "react/jsx-runtime"

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser()
  let resume
  try {
    resume = await new ResumeService(supabase, user.id).getById(id)
  } catch (err) {
    if (err instanceof ServiceError && err.status === 404) notFound()
    throw err
  }

  return (
    <Fragment>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/resumes" />}>
          ← Back
        </Button>
        {resume.is_active ? (
          <Badge>Active</Badge>
        ) : (
          <form action={setActiveResumeAction}>
            <input type="hidden" name="id" value={resume.id} />
            <Button type="submit" size="sm">
              Set as active
            </Button>
          </form>
        )}
        <Badge variant="outline">v{resume.version_number}</Badge>
        <Badge variant="secondary">{resume.file_type}</Badge>
      </div>

      <form action={updateResumeAction} className="space-y-4">
        <input type="hidden" name="id" value={resume.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" defaultValue={resume.label} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={resume.notes ?? ""} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extracted_text">Extracted text (what MCP / ATS sees)</Label>
          <Textarea
            id="extracted_text"
            name="extracted_text"
            defaultValue={resume.extracted_text}
            rows={24}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Fix parsing errors here. This is what <code>get_resume</code> returns by default.
          </p>
        </div>
        <Button type="submit">Save</Button>
      </form>
    </Fragment>
  )
}
