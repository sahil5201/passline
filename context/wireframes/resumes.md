# Wireframe: Resumes

**Route:** `/resumes` (auth required)  
**Goal:** Manage multiple resume versions; exactly one active; edit extracted text for ATS parseability.

## Layout

```
┌─ Sidebar ─┬──────────────────────────────────────────────┐
│ Dashboard │  Resumes                          [Upload]   │
│ Resumes ● │──────────────────────────────────────────────│
│ Jobs      │  Active version                              │
│ Tracker   │  ┌────────────────────────────────────────┐  │
│ Settings  │  │ Backend 2026          [Active]  v3     │  │
│           │  │ Updated Mar 8 · PDF                    │  │
│           │  │ [Edit text] [Download] [Rename]        │  │
│           │  └────────────────────────────────────────┘  │
│           │                                              │
│           │  Other versions                              │
│           │  ┌────────────────────────────────────────┐  │
│           │  │ Product Manager       v2               │  │
│           │  │ [Set active] [Edit] [Delete]           │  │
│           │  └────────────────────────────────────────┘  │
│           │  ┌────────────────────────────────────────┐  │
│           │  │ General                 v1             │  │
│           │  │ [Set active] [Edit] [Delete]           │  │
│           │  └────────────────────────────────────────┘  │
└───────────┴──────────────────────────────────────────────┘
```

## Upload / paste modal

- Tabs: **Upload file** | **Paste text**
- File: PDF, DOC, DOCX, MD, TXT (max 5 MB)
- Fields: Label (required), Notes (optional), “Set as active” checkbox
- On success: show extracted-text preview; warn on `.doc` if text looks wrong

## Extracted-text editor (`/resumes/[id]`)

```
┌─────────────────────────────────────────────────────────┐
│ ← Back   Backend 2026          [Set active] [Save]      │
│─────────────────────────────────────────────────────────│
│ Label [_____________]   Notes [________________]        │
│─────────────────────────────────────────────────────────│
│ Extracted text (what MCP / ATS sees)                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ # Sahil …                                           │ │
│ │ ## Experience                                       │ │
│ │ …                                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ Hint: Fix parsing errors here — this text is what      │
│ MCP get_resume returns by default.                      │
└─────────────────────────────────────────────────────────┘
```

## States

| State | UI |
|---|---|
| Empty | CTA to upload/paste first resume (auto-active) |
| At version limit (10) | Disable upload; explain limit |
| Delete active | Confirm; promote most recently updated remaining version |

## Out of scope for MVP UI polish

- Side-by-side original PDF vs text
- Diff between versions
