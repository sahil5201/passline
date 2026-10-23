import Link from "next/link"
import { LIMITS, ResumeService } from "@passline/core"
import {
  deleteResumeAction,
  pasteResumeAction,
  setActiveResumeAction,
  uploadResumeAction,
} from "@/app/actions/resumes"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { requireUser } from "@/lib/session"
import { toNavUser } from "@/lib/user-display"

export default async function ResumesPage() {
  const { supabase, user } = await requireUser()
  const resumes = await new ResumeService(supabase, user.id).list()
  const atLimit = resumes.length >= LIMITS.maxResumeVersionsPerUser

  return (
    <AppShell title="Resumes" user={toNavUser(user)}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {resumes.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No resumes yet</CardTitle>
                <CardDescription>
                  Upload a file or paste text. The first version becomes active automatically.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            resumes.map((resume) => (
              <Card key={resume.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-base">{resume.label}</CardTitle>
                      {resume.is_active ? <Badge>Active</Badge> : null}
                      <Badge variant="outline">v{resume.version_number}</Badge>
                      <Badge variant="secondary">{resume.file_type}</Badge>
                    </div>
                    <CardDescription>
                      Updated {new Date(resume.updated_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" render={<Link href={`/resumes/${resume.id}`} />}>
                    Edit text
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {!resume.is_active ? (
                    <form action={setActiveResumeAction}>
                      <input type="hidden" name="id" value={resume.id} />
                      <Button type="submit" size="sm">
                        Set as active
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteResumeAction}>
                    <input type="hidden" name="id" value={resume.id} />
                    <Button type="submit" size="sm" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload file</CardTitle>
              <CardDescription>
                PDF, DOC, DOCX, MD, TXT · max {LIMITS.maxResumeFileBytes / (1024 * 1024)} MB ·{" "}
                {resumes.length}/{LIMITS.maxResumeVersionsPerUser} versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={uploadResumeAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-label">Label</Label>
                  <Input id="upload-label" name="label" required disabled={atLimit} placeholder="Backend 2026" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-file">File</Label>
                  <Input id="upload-file" name="file" type="file" required disabled={atLimit} accept=".pdf,.doc,.docx,.md,.txt,text/plain,application/pdf" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-notes">Notes</Label>
                  <Input id="upload-notes" name="notes" disabled={atLimit} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="set_active" disabled={atLimit} defaultChecked={resumes.length === 0} />
                  Set as active
                </label>
                <Button type="submit" disabled={atLimit} className="w-full">
                  Upload
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste text</CardTitle>
              <CardDescription>Stored as Markdown/text for MCP.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={pasteResumeAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paste-label">Label</Label>
                  <Input id="paste-label" name="label" required disabled={atLimit} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paste-text">Resume text</Label>
                  <Textarea id="paste-text" name="text" required disabled={atLimit} rows={10} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paste-notes">Notes</Label>
                  <Input id="paste-notes" name="notes" disabled={atLimit} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="set_active" disabled={atLimit} />
                  Set as active
                </label>
                <Button type="submit" disabled={atLimit} className="w-full">
                  Save paste
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
