# UI Capability Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose four high-value backend capabilities to the lecturer UI: ExportJob history, Excel import preview, closed-session preview, and lecturer account settings.

**Architecture:** We will add lightweight UI pages and/or dialogs that call existing backend APIs (or add minimal API endpoints where missing). Each feature will be implemented as a self-contained UI chunk with its own tests where appropriate, following the existing Next.js App Router and React 19 patterns.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Prisma, Zod, SWR/react-query (where already used), shadcn/ui primitives (via existing component library).

---

### P0: ExportJob History & Download UI

**Why:** The ExportJob model already tracks export raw/summary/pdf tasks, but lecturers have no way to see past exports, retry failed ones, or re-download without regenerating.

**Files:**
- Create: `src/app/(console)/sessions/[sessionId]/exports/page.tsx`
- Modify: `src/app/api/sessions/[sessionId]/exports/route.ts` (new GET list endpoint)
- Modify: `src/components/sessions/session-workbench-page.tsx` (add "Export History" button/link)
- Create: `src/components/sessions/export-history-dialog.tsx`
- Create: `tests/unit/export-history-dialog.test.tsx`
- Test: `tests/e2e/export-history.test.ts` (if using playwright/browser)

#### Task 1: Add ExportJob list API endpoint

```typescript
// src/app/api/sessions/[sessionId]/exports/route.ts
export async function GET(_request: Request, { params }: { params: Promise<{sessionId: string}> }) {
  const session = await auth();
  // ... authorization
  const { sessionId } = await params;
  const jobs = await db.exportJob.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, kind: true, status: true, fileUrl: true, createdAt: true, error: true }
  });
  return NextResponse.json({ jobs });
}
```

- [ ] Step 1: Write the failing test (expect 401 without auth, empty array when no jobs)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 2: Export history dialog component

- [ ] Step 1: Write the failing test (renders table with columns Kind, Status, Created At, Actions)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (uses SWR to fetch /api/sessions/[sessionId]/exports)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 3: Integrate into session workbench

- [ ] Step 1: Write the failing test (renders a button that opens dialog)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (add button in header actions)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

### P0: Excel Import Preview

**Why:** The `/api/questionnaires/import` endpoint can parse and validate an Excel file, but the UI currently jumps straight to saving. Adding a preview step prevents mistakes and gives lecturers confidence.

**Files:**
- Modify: `src/components/questionnaires/questionnaire-import-panel.tsx` (add preview step)
- Create: `src/components/questionnaires/import-preview-dialog.tsx`
- Create: `tests/unit/import-preview-dialog.test.tsx`
- Test: `tests/e2e/import-preview.test.ts`

#### Task 1: Add preview button and dialog

- [ ] Step 1: Write the failing test (clicking preview calls API and shows parsed questionnaire structure)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (call `/api/questionnaires/import` with FormData, display sections/questions)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 2: Integrate preview into import flow

- [ ] Step 1: Write the failing test (after preview, user can choose to import or cancel)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (state machine: idle -> previewing -> preview shown -> confirm)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

### P0: Closed Session Preview

**Why:** Lecturers cannot see what learners see after a session is closed; a preview link reduces uncertainty and aids QA.

**Files:**
- Modify: `src/components/sessions/session-workbench-page.tsx` (add "Preview closed page" link when status=CLOSED)
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx` (same for session list)
- Create: `src/app/s/[slug]/preview/page.tsx` (optional: reuse existing closed page but with a banner)
- Test: `tests/e2e/closed-preview.test.ts`

#### Task 1: Add preview link in workbench

- [ ] Step 1: Write the failing test (renders a link when session.status === 'CLOSED')
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (link to `/s/${slug}?preview=1` or just to the public URL with a banner)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 2: Add preview banner (optional)

- [ ] Step 1: Write the failing test (shows a banner "This is a preview of the closed page" when ?preview=1)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (read query param, render banner above existing closed page)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

### P0: Lecturer Account Settings

**Why:** Lecturers can log in and see their name/email in UI nowhere; they cannot update basic info or password without contacting admin.

**Files:**
- Create: `src/app/(console)/settings/page.tsx`
- Create: `src/app/(console)/settings/layout.tsx` (optional, reuse console layout)
- Create: `src/components/settings/account-info.tsx`
- Create: `src/components/settings/change-password.tsx`
- Create: `src/features/auth/actions.ts` (updateUser, changePassword)
- Modify: `src/lib/auth.ts` (ensure user returned includes name, email)
- Test: `tests/unit/account-settings.test.tsx`
- Test: `tests/e2e/account-settings.test.ts`

#### Task 1: Add settings page skeleton

- [ ] Step 1: Write the failing test (renders a form with name, email fields prefilled)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (fetch user data via auth() or /api/me)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 2: Add update action

- [ ] Step 1: Write the failing test (on submit, calls PATCH /api/me or similar)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation (add action in src/features/auth/actions.ts: updateLecturerProfile)
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

#### Task 3: Add change password (optional)

- [ ] Step 1: Write the failing test (shows change password form, calls changePassword action)
- [ ] Step 2: Run test to verify it fails
- [ ] Step 3: Write minimal implementation
- [ ] Step 4: Run test to verify it passes
- [ ] Step 5: Commit

---

**Definition of Done:** All P0 features have unit tests passing, manual QA checklist passed, and are deployed to staging.

**Next Step:** Choose execution mode.

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-ui-capability-gap.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**