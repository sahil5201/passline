# Wireframe: Jobs

**Route:** `/jobs` (auth required)  
**Goal:** CRUD job descriptions, queue for bulk MCP ATS checks, show latest score badge.

## List (`/jobs`)

```
┌─ Sidebar ─┬──────────────────────────────────────────────────┐
│ …         │  Jobs                        [Add job]           │
│           │  Filters: All | Queued | Analyzed | Saved        │
│           │──────────────────────────────────────────────────│
│           │  Title          Company   Status    Score  Queue │
│           │  Senior BE      Acme      analyzed   78    [ ]   │
│           │  PM Intern      Beta      queued     —     [x]   │
│           │  Staff Eng      Gamma     saved      —     [ ]   │
└───────────┴──────────────────────────────────────────────────┘
```

- Score badge from latest `ats_results` for that job (— if none)
- Queue toggle sets `status` to `queued` / back to `saved` (re-queue allowed after analyzed)
- Row click → detail

## Add / edit job

```
┌─────────────────────────────────────────┐
│ Add job                                 │
│ Title*        [________________]        │
│ Company       [________________]        │
│ URL           [________________]        │
│ Role          [________________]        │
│ Industry      [________________]        │
│ Date added    [____]  Applied [____]    │
│ Job description* (max 15k chars)        │
│ ┌─────────────────────────────────────┐ │
│ │ paste JD…                           │ │
│ └─────────────────────────────────────┘ │
│ Notes         [________________]        │
│ [ ] Queue for ATS check                 │
│                    [Cancel] [Save]      │
└─────────────────────────────────────────┘
```

## Detail (`/jobs/[id]`)

```
┌─────────────────────────────────────────────────────────┐
│ ← Jobs   Senior Backend Engineer · Acme                 │
│ Status: analyzed   Score: 78   Resume: Backend 2026     │
│ [Queue for ATS] [Edit] [Delete]                         │
│─────────────────────────────────────────────────────────│
│ JD preview                                              │
│ …                                                       │
│─────────────────────────────────────────────────────────│
│ Latest ATS result                                       │
│ Matched keywords: …                                     │
│ Missing keywords: …                                     │
│ Suggested changes: …                                    │
│ Model: claude-… · Rubric: 2026.03.1                     │
│─────────────────────────────────────────────────────────│
│ Survey                                                  │
│ Applied with ATS changes?  ( ) Yes  ( ) No              │
│ Heard back?  [ none ▼ ]                                 │
└─────────────────────────────────────────────────────────┘
```

## Bulk MCP hint (empty queued banner when jobs queued)

> N jobs queued. In your AI tool, run `run_bulk_ats_check` (max 5 per call).

## Data rules (from plan)

- Results are written only via MCP `save_ats_result` (web displays)
- Job `status`: `saved | queued | analyzed`
