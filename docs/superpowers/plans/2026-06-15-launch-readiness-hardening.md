# Launch Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐正式上线前的 P0 缺口，使讲师后台具备可用的退出能力、可用的手工建卷编辑器、稳定的删除失败兜底，以及可执行的部署基础文件与上线清单。

**Architecture:** 继续沿用现有 Next.js App Router + Server Actions + Prisma 的实现方式，优先做最小范围的稳定性增强，不做与当前目标无关的重构。功能改动按“先测试后实现”的顺序推进，所有上线基础文件都与当前双域名和 Supabase 连接策略保持一致。

**Tech Stack:** Next.js 16, React 19, TypeScript, NextAuth, Prisma 7, PostgreSQL/Supabase, Vitest, Playwright, ESLint

---

## File Map

**认证与退出**
- Modify: `src/app/(console)/layout.tsx`
- Create: `src/components/auth/logout-button.tsx`
- Test: `tests/unit/logout-button.test.tsx`

**问卷编辑器 MVP**
- Modify: `src/components/questionnaires/questionnaire-builder.tsx`
- Modify: `src/features/questionnaires/schema.ts`
- Modify: `src/app/(console)/questionnaires/new/page.tsx`
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx`
- Test: `tests/unit/questionnaire-builder.test.tsx`
- Test: `tests/integration/questionnaire-actions.test.ts`

**删除错误兜底**
- Modify: `src/app/(console)/questionnaires/page.tsx`
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
- Test: `tests/integration/questionnaire-actions.test.ts`
- Test: `tests/integration/session-actions.test.ts`

**部署基础文件**
- Create: `.env.example`
- Create: `docs/deployment/pre-release-checklist.md`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `package.json`

**收口验证**
- Modify: `tests/e2e/lecturer-flow.spec.ts`
- Modify: `tests/e2e/smoke.spec.ts`

---

### Task 1: 补齐退出登录

**Files:**
- Modify: `src/app/(console)/layout.tsx`
- Create: `src/components/auth/logout-button.tsx`
- Test: `tests/unit/logout-button.test.tsx`

- [ ] **Step 1: 写失败测试，锁定退出按钮存在与点击行为**

```tsx
// tests/unit/logout-button.test.tsx
// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

import { LogoutButton } from "@/components/auth/logout-button";

describe("LogoutButton", () => {
  it("renders logout button", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "退出登录" })).toBeTruthy();
  });

  it("calls signOut with login redirect", () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm exec vitest run tests/unit/logout-button.test.tsx`
Expected: FAIL，提示 `LogoutButton` 尚不存在或布局未接入退出入口。

- [ ] **Step 3: 用最小实现补退出按钮**

```tsx
// src/components/auth/logout-button.tsx
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      退出登录
    </button>
  );
}
```

```tsx
// src/app/(console)/layout.tsx
import { LogoutButton } from "@/components/auth/logout-button";

return (
  <div className="min-h-screen bg-neutral-50">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <header className="mb-6 flex justify-end">
        <LogoutButton />
      </header>
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  </div>
);
```

- [ ] **Step 4: 复跑测试并补 lint**

Run: `pnpm exec vitest run tests/unit/logout-button.test.tsx`
Expected: PASS

Run: `pnpm exec eslint src/app/(console)/layout.tsx src/components/auth/logout-button.tsx tests/unit/logout-button.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/app/\(console\)/layout.tsx src/components/auth/logout-button.tsx tests/unit/logout-button.test.tsx
git commit -m "feat: add lecturer logout entry"
```

---

### Task 2: 把问卷编辑器从骨架补到可用 MVP

**Files:**
- Modify: `src/components/questionnaires/questionnaire-builder.tsx`
- Modify: `src/features/questionnaires/schema.ts`
- Modify: `src/app/(console)/questionnaires/new/page.tsx`
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx`
- Test: `tests/unit/questionnaire-builder.test.tsx`
- Test: `tests/integration/questionnaire-actions.test.ts`

- [ ] **Step 1: 写失败测试，锁定题目增删改最小交互**

```tsx
// tests/unit/questionnaire-builder.test.tsx
// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionnaireBuilder } from "@/components/questionnaires/questionnaire-builder";

describe("QuestionnaireBuilder", () => {
  it("adds a new question into current section", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);
    expect(screen.getAllByLabelText("题目标题").length).toBeGreaterThan(0);
  });

  it("updates question title and type", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);
    fireEvent.change(screen.getByLabelText("题目标题"), { target: { value: "你的部门" } });
    fireEvent.change(screen.getByLabelText("题型"), { target: { value: "single" } });
    expect(screen.getByDisplayValue("你的部门")).toBeTruthy();
    expect(screen.getByDisplayValue("single")).toBeTruthy();
  });

  it("removes an editable question", () => {
    render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "删除题目" }));
    expect(screen.queryByLabelText("题目标题")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm exec vitest run tests/unit/questionnaire-builder.test.tsx`
Expected: FAIL，因为当前“添加题目/编辑题目”按钮仍是 disabled。

- [ ] **Step 3: 最小实现问卷编辑器 MVP**

```tsx
// src/components/questionnaires/questionnaire-builder.tsx
function createEditableQuestion(sectionKind: "base-info" | "scored") {
  return {
    key: `q_${crypto.randomUUID()}`,
    title: "",
    type: sectionKind === "base-info" ? "text" : "single",
    required: false,
    options:
      sectionKind === "base-info"
        ? []
        : [
            { key: "option_1", label: "选项 1", score: 5 },
            { key: "option_2", label: "选项 2", score: 3 },
          ],
  };
}

function updateQuestion(sectionIndex: number, questionIndex: number, patch: Partial<QuestionnaireQuestion>) {
  setDraft((current) => ({
    ...current,
    sections: current.sections.map((section, sIdx) =>
      sIdx !== sectionIndex
        ? section
        : {
            ...section,
            questions: section.questions.map((question, qIdx) =>
              qIdx !== questionIndex ? question : { ...question, ...patch },
            ),
          },
    ),
  }));
}
```

```tsx
// 为每个 section 接入
<button
  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
  onClick={() => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((item, idx) =>
        idx !== sectionIndex
          ? item
          : {
              ...item,
              questions: [...item.questions, createEditableQuestion(item.kind === "base-info" ? "base-info" : "scored")],
            },
      ),
    }));
  }}
  type="button"
>
  添加题目
</button>
```

```tsx
// 每道题改为真实表单编辑
<label>
  <span>题目标题</span>
  <input value={question.title} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { title: event.target.value })} />
</label>
<label>
  <span>题型</span>
  <select value={question.type} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { type: event.target.value as QuestionnaireQuestion["type"] })}>
    <option value="single">single</option>
    <option value="multiple">multiple</option>
    <option value="text">text</option>
    <option value="rating">rating</option>
  </select>
</label>
<button type="button" onClick={() => removeQuestion(sectionIndex, questionIndex)}>删除题目</button>
```

- [ ] **Step 4: 扩充集成测试，锁定保存后的 schema 正确入库**

```ts
// tests/integration/questionnaire-actions.test.ts
it("persists manually edited questions", async () => {
  await createQuestionnaire("owner-1", {
    title: "培训反馈问卷",
    description: "手工编辑版本",
    sections: [
      {
        kind: "base-info",
        title: "基础信息",
        questions: [{ key: "q1", title: "你的部门", type: "single", required: true, options: [{ key: "rd", label: "研发" }] }],
      },
      {
        kind: "formal",
        title: "正式题目",
        questions: [{ key: "q2", title: "课程满意度", type: "rating", required: true, scale: 5 }],
      },
    ],
  });

  expect(questionnaireCreateMock).toHaveBeenCalled();
});
```

- [ ] **Step 5: 跑单测、集成测试、lint**

Run: `pnpm exec vitest run tests/unit/questionnaire-builder.test.tsx tests/integration/questionnaire-actions.test.ts`
Expected: PASS

Run: `pnpm exec eslint src/components/questionnaires/questionnaire-builder.tsx src/features/questionnaires/schema.ts tests/unit/questionnaire-builder.test.tsx tests/integration/questionnaire-actions.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/questionnaires/questionnaire-builder.tsx src/features/questionnaires/schema.ts src/app/\(console\)/questionnaires/new/page.tsx src/app/\(console\)/questionnaires/\[questionnaireId\]/edit/page.tsx tests/unit/questionnaire-builder.test.tsx tests/integration/questionnaire-actions.test.ts
git commit -m "feat: enable questionnaire builder mvp editing"
```

---

### Task 3: 给删除动作补用户态错误兜底

**Files:**
- Modify: `src/app/(console)/questionnaires/page.tsx`
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
- Test: `tests/integration/questionnaire-actions.test.ts`
- Test: `tests/integration/session-actions.test.ts`

- [ ] **Step 1: 写失败测试，锁定删除失败时重定向提示而不是抛 500**

```ts
// tests/integration/questionnaire-actions.test.ts
it("maps questionnaire delete business error to redirect message", async () => {
  questionnaireDeleteMock.mockRejectedValueOnce(new Error("QUESTIONNAIRE_HAS_SESSIONS"));
  await expect(deleteOwnedQuestionnaire("q1", "owner-1")).rejects.toThrow("QUESTIONNAIRE_HAS_SESSIONS");
});
```

```ts
// tests/integration/session-actions.test.ts
it("maps missing session delete to a user-facing error code", async () => {
  sessionDeleteMock.mockResolvedValueOnce({ count: 0 });
  await expect(deleteOwnedSession("s1", "owner-1")).rejects.toThrow("SESSION_NOT_FOUND");
});
```

- [ ] **Step 2: 运行相关测试，确认当前页面无兜底**

Run: `pnpm exec vitest run tests/integration/questionnaire-actions.test.ts tests/integration/session-actions.test.ts`
Expected: PASS 当前 service 层测试不变，但页面 action 仍未处理错误，需要新增页面侧测试或在实现后手动验证。

- [ ] **Step 3: 在页面 action 中补重定向错误提示**

```tsx
// src/app/(console)/questionnaires/page.tsx
type QuestionnairesPageProps = {
  searchParams: Promise<{
    importError?: string;
    deleteError?: string;
    deleted?: string;
  }>;
};

const deleteErrorMessage = getImportErrorMessage(deleteError);

try {
  await deleteOwnedQuestionnaire(questionnaireId, activeOwnerId);
} catch (error) {
  const message =
    error instanceof Error && error.message === "QUESTIONNAIRE_HAS_SESSIONS"
      ? "该问卷已经关联场次，暂时不能删除。"
      : "删除未完成，请稍后再试。";
  redirect(`/questionnaires?deleteError=${encodeURIComponent(message)}`);
}
```

```tsx
// src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx
try {
  await deleteOwnedSession(sessionId, ownerId);
} catch (error) {
  const message =
    error instanceof Error && error.message === "SESSION_NOT_FOUND"
      ? "该场次不存在或已被删除，请刷新页面后重试。"
      : "删除场次未完成，请稍后再试。";
  redirect(`/questionnaires/${questionnaireId}/sessions?deleteError=${encodeURIComponent(message)}`);
}
```

- [ ] **Step 4: 在页面头部渲染错误提示横幅**

```tsx
{deleteErrorMessage ? (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
    删除未完成：{deleteErrorMessage}
  </div>
) : null}
```

- [ ] **Step 5: 回归执行**

Run: `pnpm exec vitest run tests/integration/questionnaire-actions.test.ts tests/integration/session-actions.test.ts`
Expected: PASS

Run: `pnpm exec eslint src/app/(console)/questionnaires/page.tsx src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/app/\(console\)/questionnaires/page.tsx src/app/\(console\)/questionnaires/\[questionnaireId\]/sessions/page.tsx tests/integration/questionnaire-actions.test.ts tests/integration/session-actions.test.ts
git commit -m "fix: add delete failure fallbacks"
```

---

### Task 4: 补部署基础文件和上线前清单

**Files:**
- Create: `.env.example`
- Create: `docs/deployment/pre-release-checklist.md`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: 写失败检查，确认缺失文件确实不存在**

Run: `ls .env.example .github/workflows/ci.yml docs/deployment/pre-release-checklist.md`
Expected: FAIL 或提示文件不存在。

- [ ] **Step 2: 补 `.env.example`，明确双域名与双数据库连接**

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_SECRET="replace-with-strong-secret"
CONSOLE_ORIGIN="https://console.example.com"
SURVEY_ORIGIN="https://survey.example.com"
NEXTAUTH_URL="https://console.example.com"
```

- [ ] **Step 3: 补 `package.json` 脚本，统一本地与 CI 验证入口**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test:unit": "vitest run tests/unit tests/integration",
    "test:e2e": "playwright test",
    "test": "pnpm run test:unit"
  }
}
```

- [ ] **Step 4: 补 CI workflow**

```yaml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
```

- [ ] **Step 5: 补预发布清单文档**

```md
# Pre-release Checklist

- 配置 `DATABASE_URL` 为 Session Pooler
- 配置 `DIRECT_DATABASE_URL` 为直连地址
- 配置 `CONSOLE_ORIGIN` 为后台域名
- 配置 `SURVEY_ORIGIN` 为 Cloudflare 代理后的填写域名
- 校验二维码是否落到填写域名
- 预发布回归 `/login`、`/questionnaires`、`/questionnaires/[id]/sessions`、`/sessions/[id]`、`/s/[slug]`
- 预发布验证创建、关闭、删除、导出
```

- [ ] **Step 6: 更新 README 部署段落**

```md
## Deployment

1. 在 Vercel 配置后台域名与 `NEXTAUTH_URL`
2. 在 Cloudflare 配置填写域名并代理到 Vercel
3. 在 Vercel 配置 `DATABASE_URL`、`DIRECT_DATABASE_URL`、`AUTH_SECRET`
4. 首次部署前执行数据库 schema 同步
5. 部署后按 `docs/deployment/pre-release-checklist.md` 回归
```

- [ ] **Step 7: 跑 lint/build**

Run: `pnpm run lint && pnpm run build`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add .env.example .github/workflows/ci.yml docs/deployment/pre-release-checklist.md README.md package.json
git commit -m "chore: add launch readiness docs and ci"
```

---

### Task 5: 做上线前总回归

**Files:**
- Modify: `tests/e2e/lecturer-flow.spec.ts`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: 补登录与退出 smoke**

```ts
// tests/e2e/smoke.spec.ts
test("allows lecturer to log in and log out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("lecturer.test.20260614@example.com");
  await page.getByLabel("密码").fill("Test@123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

- [ ] **Step 2: 补手工建卷与删除失败提示回归**

```ts
// tests/e2e/lecturer-flow.spec.ts
test("supports manual questionnaire editing and shows delete error banner", async ({ page }) => {
  await page.goto("/questionnaires/new");
  await page.getByRole("button", { name: "添加题目" }).first().click();
  await page.getByLabel("题目标题").fill("你的部门");
  await page.getByRole("button", { name: "保存问卷" }).click();
  await expect(page.getByText("你的部门")).toBeVisible();
});
```

- [ ] **Step 3: 跑最终回归**

Run: `pnpm exec playwright test tests/e2e/smoke.spec.ts tests/e2e/lecturer-flow.spec.ts`
Expected: PASS

Run: `pnpm run build`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add tests/e2e/smoke.spec.ts tests/e2e/lecturer-flow.spec.ts
git commit -m "test: cover launch readiness flows"
```

---

## Self-Review

- 覆盖了 4 个已确认的 P0 方向：退出登录、问卷编辑器 MVP、删除失败兜底、部署基础文件。
- 没有引入本轮范围外的管理员端、导出任务化、监控接入等扩展需求。
- 计划按 TDD 顺序组织，每个任务都给出了文件、测试入口、命令和预期结果。
- 若执行中发现问卷 schema 与现有 builder 字段名不一致，优先以 `src/features/questionnaires/schema.ts` 为单一真源统一类型，再继续后续步骤。
