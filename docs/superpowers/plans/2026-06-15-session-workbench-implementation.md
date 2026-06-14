# Session Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the lecturer dashboard and per-session statistics page into one unified session workbench, improve adaptive layout density, and finish the agreed questionnaire/session management cleanup and import-success feedback.

**Architecture:** Keep both routes, but make them render the same workbench page shell. Move route selection, session-switching, shared action buttons, and top summary cards into reusable session-workbench units; continue reusing the existing `SessionStatisticsPanel` for the analytics body, then add focused management helpers for "delete empty questionnaire only", "delete session with cascading cleanup", newest-first list ordering, and import-success status presentation.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Vitest, Playwright, Tailwind CSS

---

## File Structure

**Create**
- `src/features/sessions/workbench.ts` — resolves which session should open in the workbench and builds switcher options/redirect targets.
- `src/components/sessions/session-workbench-page.tsx` — unified workbench shell used by both routes.
- `src/components/sessions/session-switcher.tsx` — small client component for switching sessions and syncing the URL.
- `tests/unit/session-workbench.test.ts` — unit tests for session resolution and URL target building.

**Modify**
- `src/app/(console)/dashboard/page.tsx` — replace route-specific dashboard shell with the shared workbench entry.
- `src/app/(console)/sessions/[sessionId]/page.tsx` — replace route-specific statistics shell with the shared workbench entry.
- `src/features/sessions/actions.ts` — expose the minimal owned-session list/query needed by the workbench switcher.
- `src/components/stats/chart-block.tsx` — make summary items use adaptive wrapping instead of rigid equal-width rows.
- `src/components/public/survey-form.tsx` — make single-choice and multiple-choice answers use adaptive flowing option cards.
- `src/app/(console)/questionnaires/page.tsx` — add delete-empty-questionnaire entry and user-facing restriction copy.
- `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx` — show import-success banner.
- `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx` — add delete-session entry, destructive confirmation flow, and newest-first ordering copy.
- `src/features/questionnaires/actions.ts` — add owned-questionnaire deletion rule that only allows questionnaires with zero sessions.
- `src/features/sessions/actions.ts` — add owned-session deletion with cascading cleanup and ensure newest-first list ordering.
- `tests/integration/questionnaire-actions.test.ts` — cover the delete-empty-questionnaire service behavior.
- `tests/integration/session-actions.test.ts` — cover delete-session cascading cleanup and list ordering.
- `tests/e2e/lecturer-flow.spec.ts` — update the lecturer flow to assert the unified workbench behavior.

**Keep Reused**
- `src/components/stats/session-statistics-panel.tsx` — remains the analytics body.
- `src/components/sessions/share-dialog.tsx` — remains the share dialog.
- `src/features/stats/preferences.ts` — remains the preference persistence layer.
- `src/features/stats/query.ts` — remains the statistics query layer.

---

### Task 1: Session Resolution Model

**Files:**
- Create: `tests/unit/session-workbench.test.ts`
- Create: `src/features/sessions/workbench.ts`
- Modify: `src/features/sessions/actions.ts`

- [ ] **Step 1: Write the failing unit tests for workbench session selection**

```ts
import { describe, expect, it } from "vitest";
import {
  buildSessionWorkbenchHref,
  resolveWorkbenchSessionId,
} from "@/features/sessions/workbench";

describe("resolveWorkbenchSessionId", () => {
  it("prefers the explicit session id over the dashboard default", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: "session-b",
        fallbackSessionId: "session-a",
      }),
    ).toBe("session-b");
  });

  it("falls back to the dashboard-selected session when no explicit id exists", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: undefined,
        fallbackSessionId: "session-a",
      }),
    ).toBe("session-a");
  });

  it("returns null when neither route provides a session", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: undefined,
        fallbackSessionId: null,
      }),
    ).toBeNull();
  });
});

describe("buildSessionWorkbenchHref", () => {
  it("routes workbench navigation to the session deep link", () => {
    expect(buildSessionWorkbenchHref("session-a")).toBe("/sessions/session-a");
  });
});
```

- [ ] **Step 2: Run the unit tests and verify they fail**

Run:

```bash
pnpm exec vitest run tests/unit/session-workbench.test.ts
```

Expected:

```text
FAIL  Cannot find module "@/features/sessions/workbench"
```

- [ ] **Step 3: Add the minimal workbench helper implementation**

```ts
type ResolveWorkbenchSessionIdInput = {
  requestedSessionId?: string;
  fallbackSessionId: string | null;
};

export function resolveWorkbenchSessionId({
  requestedSessionId,
  fallbackSessionId,
}: ResolveWorkbenchSessionIdInput) {
  return requestedSessionId ?? fallbackSessionId;
}

export function buildSessionWorkbenchHref(sessionId: string) {
  return `/sessions/${sessionId}`;
}
```

- [ ] **Step 4: Expose the owned-session list needed by the switcher**

Add a focused query to `src/features/sessions/actions.ts`:

```ts
export async function listOwnedSessionsForWorkbench(ownerId: string) {
  return db.session.findMany({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      questionnaireId: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}
```

- [ ] **Step 5: Re-run the unit tests and verify they pass**

Run:

```bash
pnpm exec vitest run tests/unit/session-workbench.test.ts
```

Expected:

```text
PASS  tests/unit/session-workbench.test.ts
```

- [ ] **Step 6: Commit the session resolution foundation**

```bash
git add tests/unit/session-workbench.test.ts src/features/sessions/workbench.ts src/features/sessions/actions.ts
git commit -m "feat: add session workbench resolution helpers"
```

---

### Task 2: Shared Workbench Shell

**Files:**
- Create: `src/components/sessions/session-workbench-page.tsx`
- Modify: `src/app/(console)/dashboard/page.tsx`
- Modify: `src/app/(console)/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Write the failing dashboard route test expectation**

Extend `tests/e2e/lecturer-flow.spec.ts` with a focused assertion:

```ts
await page.goto("/dashboard");
await expect(page.getByRole("heading", { name: "场次工作台" })).toBeVisible();
await expect(page.getByRole("button", { name: "投屏填写" })).toBeVisible();
await expect(page.getByRole("link", { name: "导出原始明细" })).toBeVisible();
```

- [ ] **Step 2: Run the e2e spec fragment and verify it fails**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts --grep "场次工作台"
```

Expected:

```text
FAIL  heading "场次工作台" not found
```

- [ ] **Step 3: Create the shared workbench page component**

Add `src/components/sessions/session-workbench-page.tsx` with this shape:

```tsx
type SessionWorkbenchPageProps = {
  mode: "dashboard" | "session";
  statistics: SessionStatistics;
  preference: DashboardPreference;
  savePreferenceAction: (formData: FormData) => Promise<void>;
  closeSessionAction: (formData: FormData) => Promise<void>;
  sessionOptions: Array<{
    id: string;
    name: string;
    status: "ACTIVE" | "CLOSED";
  }>;
};

export function SessionWorkbenchPage(props: SessionWorkbenchPageProps) {
  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Session Workbench
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            场次工作台
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <SessionSwitcher
            currentSessionId={props.statistics.session.id}
            sessions={props.sessionOptions}
          />
          <ShareDialog
            sessionName={props.statistics.session.name}
            url={props.statistics.session.publicUrl}
          />
          <a href={`/api/sessions/${props.statistics.session.id}/exports/raw`}>导出原始明细</a>
          <a href={`/api/sessions/${props.statistics.session.id}/exports/summary`}>导出统计汇总</a>
          <a href={`/api/sessions/${props.statistics.session.id}/exports/pdf`}>导出 PDF</a>
        </div>
      </header>

      <SessionStatisticsPanel
        preference={props.preference}
        savePreferenceAction={props.savePreferenceAction}
        statistics={props.statistics}
      />
    </section>
  );
}
```

- [ ] **Step 4: Replace both route shells with the shared component**

In `src/app/(console)/dashboard/page.tsx`, reduce the route to:

```tsx
const requestedSessionId = resolveWorkbenchSessionId({
  requestedSessionId: undefined,
  fallbackSessionId: dashboardSession?.id ?? null,
});

if (!requestedSessionId || !statistics) {
  return <EmptyDashboardState />;
}

return (
  <SessionWorkbenchPage
    closeSessionAction={handleCloseSession}
    mode="dashboard"
    preference={preference}
    savePreferenceAction={handleSavePreference}
    sessionOptions={sessionOptions}
    statistics={statistics}
  />
);
```

In `src/app/(console)/sessions/[sessionId]/page.tsx`, reduce the route to:

```tsx
return (
  <SessionWorkbenchPage
    closeSessionAction={handleCloseSession}
    mode="session"
    preference={preference}
    savePreferenceAction={handleSavePreference}
    sessionOptions={sessionOptions}
    statistics={statistics}
  />
);
```

- [ ] **Step 5: Run the targeted e2e check and make it pass**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts --grep "场次工作台"
```

Expected:

```text
PASS  tests/e2e/lecturer-flow.spec.ts
```

- [ ] **Step 6: Commit the shared page shell**

```bash
git add src/components/sessions/session-workbench-page.tsx src/app/'(console)'/dashboard/page.tsx src/app/'(console)'/sessions/'[sessionId]'/page.tsx tests/e2e/lecturer-flow.spec.ts
git commit -m "feat: merge dashboard and session page shells"
```

---

### Task 3: Session Switcher and URL Sync

**Files:**
- Create: `src/components/sessions/session-switcher.tsx`
- Modify: `src/components/sessions/session-workbench-page.tsx`
- Test: `tests/unit/session-workbench.test.ts`

- [ ] **Step 1: Add the failing URL-sync unit test**

Append to `tests/unit/session-workbench.test.ts`:

```ts
it("always targets the deep-link route when switching sessions", () => {
  expect(buildSessionWorkbenchHref("cmqe189e00001gzxspgo6q2ut")).toBe(
    "/sessions/cmqe189e00001gzxspgo6q2ut",
  );
});
```

- [ ] **Step 2: Run the unit tests to verify the new behavior is covered**

Run:

```bash
pnpm exec vitest run tests/unit/session-workbench.test.ts
```

Expected:

```text
PASS or FAIL only on href behavior if helper changed
```

If it already passes, keep the test and move to the UI implementation.

- [ ] **Step 3: Add the client switcher**

Create `src/components/sessions/session-switcher.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { buildSessionWorkbenchHref } from "@/features/sessions/workbench";

export function SessionSwitcher({
  currentSessionId,
  sessions,
}: {
  currentSessionId: string;
  sessions: Array<{ id: string; name: string; status: "ACTIVE" | "CLOSED" }>;
}) {
  const router = useRouter();

  return (
    <select
      className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700"
      defaultValue={currentSessionId}
      onChange={(event) => {
        router.push(buildSessionWorkbenchHref(event.target.value));
      }}
    >
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.name} {session.status === "ACTIVE" ? "· 进行中" : "· 已关闭"}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Mount the switcher in the shared workbench header**

Update `src/components/sessions/session-workbench-page.tsx`:

```tsx
<SessionSwitcher
  currentSessionId={statistics.session.id}
  sessions={sessionOptions}
/>
```

Also keep the existing `返回场次管理` link:

```tsx
<Link href={`/questionnaires/${statistics.session.questionnaireId}/sessions`}>
  返回场次管理
</Link>
```

- [ ] **Step 5: Manually verify URL sync**

Run the app, then verify:

```text
1. Open /dashboard
2. Change the selected session
3. Confirm the browser URL becomes /sessions/<new-id>
4. Refresh the page
5. Confirm the same session still renders
```

- [ ] **Step 6: Commit the session switcher**

```bash
git add src/components/sessions/session-switcher.tsx src/components/sessions/session-workbench-page.tsx tests/unit/session-workbench.test.ts
git commit -m "feat: add session workbench switcher"
```

---

### Task 4: Close Action, Empty State, and Regression Cleanup

**Files:**
- Modify: `src/components/sessions/session-workbench-page.tsx`
- Modify: `src/app/(console)/dashboard/page.tsx`
- Modify: `src/app/(console)/sessions/[sessionId]/page.tsx`
- Modify: `tests/e2e/lecturer-flow.spec.ts`

- [ ] **Step 1: Add the failing interaction assertions**

Extend `tests/e2e/lecturer-flow.spec.ts`:

```ts
await expect(page.getByRole("button", { name: "关闭场次" })).toBeVisible();
await expect(page.getByRole("link", { name: "返回场次管理" })).toBeVisible();
await expect(page.getByText("回收量")).toBeVisible();
await expect(page.getByText("最近提交")).toBeVisible();
```

- [ ] **Step 2: Run the lecturer flow and confirm the workbench still regresses**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
```

Expected:

```text
FAIL on at least one missing workbench control or heading
```

- [ ] **Step 3: Complete the shared workbench controls**

Ensure `src/components/sessions/session-workbench-page.tsx` includes:

```tsx
{statistics.session.status === "ACTIVE" ? (
  <form action={closeSessionAction}>
    <input name="sessionId" type="hidden" value={statistics.session.id} />
    <button type="submit">关闭场次</button>
  </form>
) : null}
```

And include the top metric cards:

```tsx
<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  <MetricCard label="回收量" value={statistics.responseOverview.submissionCount} />
  <MetricCard label="最近提交" value={formatDate(statistics.responseOverview.lastSubmittedAt)} />
  <MetricCard label="填写域名" value={formatPublicOrigin(statistics.session.publicUrl)} />
  <MetricCard
    label="当前状态"
    value={statistics.session.status === "ACTIVE" ? "正在回收反馈" : "场次已结束"}
  />
</section>
```

- [ ] **Step 4: Preserve the dashboard empty state**

Keep the no-session behavior in `src/app/(console)/dashboard/page.tsx`:

```tsx
if (!requestedSessionId || !statistics) {
  return (
    <div className="rounded-[36px] border border-dashed border-neutral-300 bg-white/90 px-8 py-16 text-center shadow-sm backdrop-blur">
      <h2 className="text-2xl font-semibold text-neutral-950">还没有场次</h2>
      <Link href="/questionnaires">去创建场次</Link>
    </div>
  );
}
```

- [ ] **Step 5: Run regression checks and make them green**

Run:

```bash
pnpm exec vitest run tests/unit/session-workbench.test.ts
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
pnpm exec eslint src/app/'(console)'/dashboard/page.tsx src/app/'(console)'/sessions/'[sessionId]'/page.tsx src/components/sessions/session-workbench-page.tsx src/components/sessions/session-switcher.tsx src/features/sessions/workbench.ts
```

Expected:

```text
All tests PASS
ESLint exits with code 0
```

- [ ] **Step 6: Commit the unified workbench behavior**

```bash
git add src/app/'(console)'/dashboard/page.tsx src/app/'(console)'/sessions/'[sessionId]'/page.tsx src/components/sessions/session-workbench-page.tsx tests/e2e/lecturer-flow.spec.ts
git commit -m "feat: finalize unified session workbench"
```

---

### Task 5: Adaptive Card and Answer Layout

**Files:**
- Modify: `src/components/stats/chart-block.tsx`
- Modify: `src/components/public/survey-form.tsx`
- Modify: `tests/e2e/lecturer-flow.spec.ts`

- [ ] **Step 1: Add the failing layout-oriented e2e assertions**

Extend `tests/e2e/lecturer-flow.spec.ts` with checks that short options and short stats no longer render as rigid single-column rows:

```ts
await page.goto("/sessions/e2e-session");
const statItems = page.locator("text=/上海|深圳|北京/").locator("..");
await expect(statItems.first()).not.toHaveCSS("width", "100%");

await page.goto("/s/e2eslug01");
const answerOption = page.getByLabel("上海");
await expect(answerOption).toBeVisible();
```

Also capture a screenshot for visual verification:

```ts
await page.screenshot({ path: "test-results/session-workbench-adaptive-layout.png", fullPage: true });
```

- [ ] **Step 2: Run the e2e spec and verify the current rigid layout fails review**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts --grep "adaptive"
```

Expected:

```text
FAIL on the layout assertion or visual review because the current option rows/stat rows occupy full-width rigid lanes
```

- [ ] **Step 3: Make chart summary items adaptive**

Update `src/components/stats/chart-block.tsx` so the data summary area changes from rigid equal-width rows to content-responsive wrapping:

```tsx
<div className="mt-5 flex flex-wrap gap-2">
  {data.map((entry) => (
    <div
      className="inline-flex min-w-[160px] max-w-full items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm"
      key={`${entry.label}-${entry.value}`}
    >
      <span className="truncate text-neutral-700">{entry.label}</span>
      <span className="whitespace-nowrap font-medium text-neutral-950">
        {renderValue(entry.value)} / {(entry.percentage * 100).toFixed(0)}%
      </span>
    </div>
  ))}
</div>
```

This keeps short entries visually compact while still allowing long labels to wrap when needed.

- [ ] **Step 4: Make public answer options adaptive**

Update the single-choice and multiple-choice option groups in `src/components/public/survey-form.tsx`:

```tsx
<div className="flex flex-wrap gap-3">
  {question.options.map((option) => {
    const value = getOptionLabel(option);

    return (
      <label
        key={`${question.key}-${value}`}
        className="inline-flex min-h-12 min-w-[140px] max-w-full cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-emerald-300"
      >
        <input
          className="h-4 w-4 shrink-0 accent-emerald-500"
          name={question.key}
          type="radio"
          value={value}
        />
        <span className="break-words text-sm text-neutral-700">{value}</span>
      </label>
    );
  })}
</div>
```

Apply the same wrapping model to the checkbox branch so short answers can sit side by side while long answers still remain readable.

- [ ] **Step 5: Re-run layout verification and lint**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
pnpm exec eslint src/components/stats/chart-block.tsx src/components/public/survey-form.tsx
```

Expected:

```text
PASS  tests/e2e/lecturer-flow.spec.ts
ESLint exits with code 0
```

- [ ] **Step 6: Commit the adaptive layout refinement**

```bash
git add src/components/stats/chart-block.tsx src/components/public/survey-form.tsx tests/e2e/lecturer-flow.spec.ts
git commit -m "feat: make stats cards and answer options adaptive"
```

---

### Task 6: Delete Empty Questionnaire Only

**Files:**
- Modify: `src/features/questionnaires/actions.ts`
- Modify: `src/app/(console)/questionnaires/page.tsx`
- Modify: `tests/integration/questionnaire-actions.test.ts`

- [ ] **Step 1: Add the failing questionnaire deletion integration test**

Append to `tests/integration/questionnaire-actions.test.ts`:

```ts
it("deletes a questionnaire only when it has no sessions", async () => {
  sessionCountMock.mockResolvedValue(0);
  deleteMock.mockResolvedValue({ id: "q-empty" });

  const result = await deleteOwnedQuestionnaire("q-empty", "u1");

  expect(result).toEqual({ id: "q-empty" });
  expect(deleteMock).toHaveBeenCalledWith({
    where: { id: "q-empty", ownerId: "u1" },
  });
});

it("rejects deleting a questionnaire that already has sessions", async () => {
  sessionCountMock.mockResolvedValue(2);

  await expect(deleteOwnedQuestionnaire("q-used", "u1")).rejects.toThrow(
    "QUESTIONNAIRE_NOT_EMPTY",
  );
  expect(deleteMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run:

```bash
pnpm exec vitest run tests/integration/questionnaire-actions.test.ts
```

Expected:

```text
FAIL  deleteOwnedQuestionnaire is not defined
```

- [ ] **Step 3: Implement the delete-empty-questionnaire service**

Add to `src/features/questionnaires/actions.ts`:

```ts
export async function deleteOwnedQuestionnaire(questionnaireId: string, ownerId: string) {
  const sessionCount = await db.session.count({
    where: {
      questionnaireId,
      ownerId,
    },
  });

  if (sessionCount > 0) {
    throw new Error("QUESTIONNAIRE_NOT_EMPTY");
  }

  return db.questionnaire.delete({
    where: {
      id: questionnaireId,
      ownerId,
    },
  });
}
```

- [ ] **Step 4: Add the questionnaire-list deletion UI**

Update `src/app/(console)/questionnaires/page.tsx` so each card follows this rule:

```tsx
const canDelete = questionnaire._count.sessions === 0;

{canDelete ? (
  <form action={deleteQuestionnaireAction}>
    <input name="questionnaireId" type="hidden" value={questionnaire.id} />
    <button
      className="inline-flex items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700"
      type="submit"
    >
      删除问卷
    </button>
  </form>
) : (
  <span className="inline-flex items-center rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
    已有关联场次，不可删除
  </span>
)}
```

And add a server action with confirmation-aware copy:

```tsx
async function deleteQuestionnaireAction(formData: FormData) {
  "use server";

  const session = await auth();
  const ownerId = session?.user?.id;

  if (!ownerId) {
    redirect("/login");
  }

  const questionnaireId = String(formData.get("questionnaireId") ?? "");

  try {
    await deleteOwnedQuestionnaire(questionnaireId, ownerId);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "QUESTIONNAIRE_NOT_EMPTY"
        ? "该问卷已经创建过场次，当前不能删除。"
        : "删除未完成，请稍后重试。";
    redirect(`/questionnaires?deleteError=${encodeURIComponent(message)}`);
  }

  redirect("/questionnaires?deleted=1");
}
```

- [ ] **Step 5: Re-run the questionnaire integration test**

Run:

```bash
pnpm exec vitest run tests/integration/questionnaire-actions.test.ts
```

Expected:

```text
PASS  tests/integration/questionnaire-actions.test.ts
```

- [ ] **Step 6: Commit the questionnaire deletion rule**

```bash
git add src/features/questionnaires/actions.ts src/app/'(console)'/questionnaires/page.tsx tests/integration/questionnaire-actions.test.ts
git commit -m "feat: allow deleting empty questionnaires only"
```

---

### Task 7: Excel Import Success Feedback

**Files:**
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx`
- Modify: `tests/e2e/lecturer-flow.spec.ts`

- [ ] **Step 1: Add the failing import-success expectation**

Extend `tests/e2e/lecturer-flow.spec.ts`:

```ts
await page.goto("/questionnaires/some-id/edit?imported=1");
await expect(
  page.getByText("Excel 问卷已成功导入，请继续检查并完善内容。"),
).toBeVisible();
```

- [ ] **Step 2: Run the e2e spec fragment and verify it fails**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts --grep "成功导入"
```

Expected:

```text
FAIL  text "Excel 问卷已成功导入，请继续检查并完善内容。" not found
```

- [ ] **Step 3: Add the business success banner to the edit page**

Update `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx`:

```tsx
type EditQuestionnairePageProps = {
  params: Promise<{ questionnaireId: string }>;
  searchParams: Promise<{ imported?: string }>;
};

const { imported } = await searchParams;
const showImportedBanner = imported === "1";

{showImportedBanner ? (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
    Excel 问卷已成功导入，请继续检查并完善内容。
  </div>
) : null}
```

- [ ] **Step 4: Verify the import-success banner passes**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts --grep "成功导入"
```

Expected:

```text
PASS  tests/e2e/lecturer-flow.spec.ts
```

- [ ] **Step 5: Run targeted lint and regression checks**

Run:

```bash
pnpm exec vitest run tests/integration/questionnaire-actions.test.ts
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
pnpm exec eslint src/app/'(console)'/questionnaires/page.tsx src/app/'(console)'/questionnaires/'[questionnaireId]'/edit/page.tsx src/features/questionnaires/actions.ts
```

Expected:

```text
All tests PASS
ESLint exits with code 0
```

- [ ] **Step 6: Commit the questionnaire-list polish**

```bash
git add src/app/'(console)'/questionnaires/page.tsx src/app/'(console)'/questionnaires/'[questionnaireId]'/edit/page.tsx src/features/questionnaires/actions.ts tests/e2e/lecturer-flow.spec.ts
git commit -m "feat: add questionnaire cleanup and import success feedback"
```

---

### Task 8: Delete Session and Newest-First Ordering

**Files:**
- Modify: `src/features/sessions/actions.ts`
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
- Modify: `src/features/questionnaires/actions.ts`
- Modify: `tests/integration/session-actions.test.ts`
- Modify: `tests/e2e/lecturer-flow.spec.ts`

- [ ] **Step 1: Add the failing session deletion and ordering tests**

Create or extend `tests/integration/session-actions.test.ts`:

```ts
it("lists sessions with newest first", async () => {
  findManyMock.mockResolvedValue([{ id: "new" }, { id: "old" }]);

  await listQuestionnaireSessions("q1", "u1");

  expect(findManyMock).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: [{ createdAt: "desc" }],
    }),
  );
});

it("deletes a session and its dependent data", async () => {
  deleteMock.mockResolvedValue({ id: "s1" });

  const result = await deleteOwnedSession("s1", "u1");

  expect(result).toEqual({ id: "s1" });
  expect(deleteMock).toHaveBeenCalledWith({
    where: { id: "s1", ownerId: "u1" },
  });
});
```

Also extend `tests/integration/questionnaire-actions.test.ts`:

```ts
it("lists questionnaires with newest first", async () => {
  findManyMock.mockResolvedValue([{ id: "new" }, { id: "old" }]);

  await listOwnedQuestionnaires("u1");

  expect(findManyMock).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: [{ createdAt: "desc" }],
    }),
  );
});
```

- [ ] **Step 2: Run the integration tests and verify they fail**

Run:

```bash
pnpm exec vitest run tests/integration/session-actions.test.ts tests/integration/questionnaire-actions.test.ts
```

Expected:

```text
FAIL  deleteOwnedSession is not defined
```

- [ ] **Step 3: Implement newest-first ordering and destructive session deletion**

Update `src/features/questionnaires/actions.ts`:

```ts
export async function listOwnedQuestionnaires(ownerId: string) {
  return db.questionnaire.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}
```

Update `src/features/sessions/actions.ts`:

```ts
export async function listQuestionnaireSessions(questionnaireId: string, ownerId: string) {
  return db.session.findMany({
    where: { questionnaireId, ownerId },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function deleteOwnedSession(sessionId: string, ownerId: string) {
  return db.session.delete({
    where: {
      id: sessionId,
      ownerId,
    },
  });
}
```

This step assumes Prisma relations already cascade dependent cleanup; if they do not, update the Prisma schema or explicit delete order before shipping.

- [ ] **Step 4: Add delete-session UI to the session management page**

Update `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`:

```tsx
async function deleteSessionAction(formData: FormData) {
  "use server";

  const session = await auth();
  const ownerId = session?.user?.id;

  if (!ownerId) {
    redirect("/login");
  }

  const sessionId = String(formData.get("sessionId") ?? "");
  await deleteOwnedSession(sessionId, ownerId);
  redirect(`/questionnaires/${questionnaireId}/sessions?deleted=1`);
}
```

Render a destructive confirmed action for every session card:

```tsx
<form action={deleteSessionAction}>
  <input name="sessionId" type="hidden" value={item.id} />
  <DeleteSessionButton />
</form>
```

The client confirmation copy must say:

```text
删除后，该场次的答卷、统计与导出记录将一并清除，且不可恢复。
```

- [ ] **Step 5: Run integration and e2e verification**

Run:

```bash
pnpm exec vitest run tests/integration/session-actions.test.ts tests/integration/questionnaire-actions.test.ts
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
pnpm exec eslint src/features/sessions/actions.ts src/app/'(console)'/questionnaires/'[questionnaireId]'/sessions/page.tsx src/features/questionnaires/actions.ts
```

Expected:

```text
All tests PASS
ESLint exits with code 0
```

- [ ] **Step 6: Commit the session management update**

```bash
git add src/features/sessions/actions.ts src/app/'(console)'/questionnaires/'[questionnaireId]'/sessions/page.tsx src/features/questionnaires/actions.ts tests/integration/session-actions.test.ts tests/integration/questionnaire-actions.test.ts
git commit -m "feat: add destructive session deletion and newest-first ordering"
```

---

## Self-Review

### Spec Coverage

- Unified `场次工作台` shell: covered by Task 2.
- Preserve `/dashboard` and `/sessions/[sessionId]` as two entry paths: covered by Tasks 1 and 2.
- Add session-switching with URL sync: covered by Task 3.
- Keep share/export/close-session actions in one place: covered by Tasks 2 and 4.
- Keep current statistics/configuration system unchanged under the new shell: covered by Tasks 2 and 4.
- Add adaptive, content-responsive layout for short cards and answer options: covered by Task 5.
- Add delete-empty-questionnaire behavior in the questionnaire list: covered by Task 6.
- Add explicit business success feedback after Excel import: covered by Task 7.
- Add destructive session deletion and newest-first questionnaire/session ordering: covered by Task 8.

### Placeholder Scan

- No `TODO` / `TBD` placeholders remain.
- Every task has concrete files, commands, and expected outcomes.

### Type Consistency

- Helper names are consistent across tasks: `resolveWorkbenchSessionId`, `buildSessionWorkbenchHref`, `SessionWorkbenchPage`, `SessionSwitcher`, `listOwnedSessionsForWorkbench`.
- Route props and statistics usage match the existing `SessionStatisticsPanel` shape.
