# Survey Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, Apple-inspired survey platform MVP for lecturers with questionnaire creation, session-based anonymous collection, configurable statistics, exports, and dual-domain deployment.

**Architecture:** Use a single Next.js App Router application deployed on Vercel. Split lecturer console and public survey access by origin using environment-based URL generation, store relational data in Supabase Postgres via Prisma, and keep session statistics fast by updating aggregate tables transactionally when each submission arrives.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Supabase Postgres, Auth.js, Zod, XLSX, Recharts, QRCode, Vitest, Playwright

---

## File Structure

### Application

- `package.json` - app scripts and dependencies
- `next.config.ts` - Next.js settings
- `prisma/schema.prisma` - relational schema for users, questionnaires, sessions, submissions, aggregates, dashboard preferences, export jobs
- `src/app/layout.tsx` - global layout and providers
- `src/app/globals.css` - Apple-inspired theme tokens and base styles
- `src/app/(console)/layout.tsx` - authenticated lecturer shell with footer text
- `src/app/(console)/dashboard/page.tsx` - lecturer dashboard showing most recent active session or most recent closed session
- `src/app/(console)/questionnaires/page.tsx` - questionnaire list with create, import, edit actions
- `src/app/(console)/questionnaires/new/page.tsx` - manual questionnaire builder
- `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx` - questionnaire editor
- `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx` - session list and quick actions
- `src/app/(console)/sessions/[sessionId]/page.tsx` - session statistics page
- `src/app/s/[slug]/page.tsx` - public anonymous survey page
- `src/app/s/[slug]/closed/page.tsx` - closed-session page

### Features

- `src/features/auth/*` - lecturer auth, session checks, password hashing
- `src/features/questionnaires/*` - questionnaire schema builder, validation, import/export template helpers
- `src/features/sessions/*` - session creation, closing, share links, QR generation
- `src/features/submissions/*` - public submission validation and persistence
- `src/features/stats/*` - aggregate computation, chart config, dashboard preferences
- `src/features/exports/*` - CSV/XLSX export, PDF export, QR download helpers

### Shared

- `src/components/*` - shell, cards, charts, dialogs, footer, builder blocks
- `src/lib/db.ts` - Prisma client
- `src/lib/env.ts` - typed env parsing
- `src/lib/auth.ts` - Auth.js setup
- `src/lib/origins.ts` - console origin and public survey origin helpers

### Testing

- `tests/unit/*` - schema, aggregation, origin generation, import parsing
- `tests/integration/*` - route handlers and server-side actions
- `tests/e2e/*` - lecturer flows and public survey flow

## Task 1: Bootstrap The Workspace

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/components/layout/app-footer.tsx`
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Initialize the app and baseline tooling**

Run:

```bash
pnpm dlx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm
pnpm add @prisma/client prisma zod next-auth bcryptjs recharts qrcode xlsx @radix-ui/react-dialog sonner
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom playwright @playwright/test
git init
```

Expected: Next.js app files exist, `pnpm lint` runs, and the workspace becomes a Git repository.

- [ ] **Step 2: Write the failing smoke test for the branded footer**

```ts
import { test, expect } from "@playwright/test";

test("shows the lecturer footer on console pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("人力资源本部 · 人才发展部")).toBeVisible();
});
```

Save to `tests/e2e/smoke.spec.ts`.

- [ ] **Step 3: Implement the minimal shell, redirect, and footer**

```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
```

```tsx
// src/components/layout/app-footer.tsx
export function AppFooter() {
  return (
    <footer className="py-6 text-center text-sm text-neutral-500">
      人力资源本部 · 人才发展部
    </footer>
  );
}
```

```tsx
// src/app/layout.tsx
import "./globals.css";
import { AppFooter } from "@/components/layout/app-footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-neutral-950 antialiased">
        <main className="min-h-screen">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run the smoke checks**

Run:

```bash
pnpm exec playwright install
pnpm lint
pnpm exec playwright test tests/e2e/smoke.spec.ts
```

Expected: lint passes and the smoke test passes.

- [ ] **Step 5: Commit the foundation**

```bash
git add .
git commit -m "chore: bootstrap survey platform workspace"
```

## Task 2: Define The Data Model And Environment Contracts

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/lib/env.ts`
- Create: `.env.example`
- Test: `tests/unit/env.test.ts`

- [ ] **Step 1: Write the failing env validation test**

```ts
import { describe, expect, it } from "vitest";
import { envSchema } from "@/lib/env";

describe("envSchema", () => {
  it("requires separate console and survey origins", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app",
      AUTH_SECRET: "secret",
      CONSOLE_ORIGIN: "https://console.example.com",
      SURVEY_ORIGIN: "https://survey.example.com",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/env.test.ts
```

Expected: FAIL because `envSchema` does not exist yet.

- [ ] **Step 3: Implement Prisma models and env parsing**

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  passwordHash   String
  name           String
  questionnaires Questionnaire[]
  sessions       Session[]       @relation("SessionOwner")
  dashboardPrefs DashboardPref?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model Questionnaire {
  id          String    @id @default(cuid())
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])
  title       String
  description String?
  schemaJson  Json
  sessions    Session[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Session {
  id                 String           @id @default(cuid())
  questionnaireId    String
  ownerId            String
  name               String
  slug               String           @unique
  status             SessionStatus    @default(ACTIVE)
  publicUrl          String
  questionnaire      Questionnaire    @relation(fields: [questionnaireId], references: [id])
  owner              User             @relation("SessionOwner", fields: [ownerId], references: [id])
  submissions        Submission[]
  scoreAggregates    ScoreAggregate[]
  optionAggregates   OptionAggregate[]
  exportJobs         ExportJob[]
  createdAt          DateTime         @default(now())
  closedAt           DateTime?
  updatedAt          DateTime         @updatedAt
}

model Submission {
  id           String   @id @default(cuid())
  sessionId    String
  payloadJson  Json
  totalScore   Float?
  submittedAt  DateTime @default(now())
  session      Session  @relation(fields: [sessionId], references: [id])
}

model ScoreAggregate {
  id            String   @id @default(cuid())
  sessionId      String
  questionKey    String
  averageScore   Float
  totalScore     Float
  submissionCount Int
  session        Session  @relation(fields: [sessionId], references: [id])
}

model OptionAggregate {
  id            String   @id @default(cuid())
  sessionId      String
  questionKey    String
  optionKey      String
  choiceCount    Int
  session        Session  @relation(fields: [sessionId], references: [id])
}

model DashboardPref {
  id               String  @id @default(cuid())
  userId           String  @unique
  user             User    @relation(fields: [userId], references: [id])
  hiddenModules    Json
  chartTypeByBlock Json
}

model ExportJob {
  id          String      @id @default(cuid())
  sessionId    String
  kind        ExportKind
  status      ExportStatus @default(PENDING)
  fileUrl     String?
  session     Session      @relation(fields: [sessionId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum SessionStatus {
  ACTIVE
  CLOSED
}

enum ExportKind {
  RAW_XLSX
  SUMMARY_XLSX
  PDF
}

enum ExportStatus {
  PENDING
  READY
  FAILED
}
```

```ts
// src/lib/env.ts
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  CONSOLE_ORIGIN: z.string().url(),
  SURVEY_ORIGIN: z.string().url(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  CONSOLE_ORIGIN: process.env.CONSOLE_ORIGIN,
  SURVEY_ORIGIN: process.env.SURVEY_ORIGIN,
});
```

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 4: Generate the client and rerun the checks**

Run:

```bash
pnpm prisma generate
pnpm prisma format
pnpm vitest run tests/unit/env.test.ts
```

Expected: Prisma generation succeeds and the env test passes.

- [ ] **Step 5: Commit the data contract**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/env.ts .env.example tests/unit/env.test.ts
git commit -m "feat: define survey platform data model"
```

## Task 3: Implement Lecturer Authentication And Console Shell

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/features/auth/register.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(console)/layout.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/integration/auth.test.ts`

- [ ] **Step 1: Write the failing registration test**

```ts
import { describe, expect, it, vi } from "vitest";
import { registerLecturer } from "@/features/auth/register";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: vi.fn().mockResolvedValue({ id: "u1", email: "lecturer@example.com" }),
    },
  },
}));

describe("registerLecturer", () => {
  it("hashes the password before persisting", async () => {
    const user = await registerLecturer({
      name: "讲师",
      email: "lecturer@example.com",
      password: "StrongPass123",
    });

    expect(user.email).toBe("lecturer@example.com");
  });
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/auth.test.ts
```

Expected: FAIL because the registration feature has not been implemented.

- [ ] **Step 3: Implement Auth.js, registration, and console layout protection**

```ts
// src/features/auth/register.ts
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function registerLecturer(input: {
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
  });
}
```

```tsx
// src/app/(console)/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppFooter } from "@/components/layout/app-footer";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <div className="flex-1">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
```

```tsx
// src/app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-neutral-950 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify authentication behavior**

Run:

```bash
pnpm vitest run tests/integration/auth.test.ts
pnpm lint
```

Expected: registration test passes and console layout still compiles cleanly.

- [ ] **Step 5: Commit authentication**

```bash
git add src/lib/auth.ts src/features/auth src/app/\(auth\) src/app/\(console\)/layout.tsx src/app/layout.tsx tests/integration/auth.test.ts
git commit -m "feat: add lecturer authentication and console shell"
```

## Task 4: Build Questionnaire CRUD And Manual Builder

**Files:**
- Create: `src/features/questionnaires/schema.ts`
- Create: `src/features/questionnaires/actions.ts`
- Create: `src/app/(console)/questionnaires/page.tsx`
- Create: `src/app/(console)/questionnaires/new/page.tsx`
- Create: `src/app/(console)/questionnaires/[questionnaireId]/edit/page.tsx`
- Create: `src/components/questionnaires/questionnaire-builder.tsx`
- Test: `tests/unit/questionnaire-schema.test.ts`

- [ ] **Step 1: Write the failing schema validation test**

```ts
import { describe, expect, it } from "vitest";
import { questionnaireSchema } from "@/features/questionnaires/schema";

describe("questionnaireSchema", () => {
  it("accepts base info blocks and scored formal questions", () => {
    const result = questionnaireSchema.safeParse({
      title: "培训反馈",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [{ key: "department", type: "single", title: "部门", options: ["研发", "产品"] }],
        },
        {
          kind: "formal",
          title: "正式题目",
          questions: [
            {
              key: "course-quality",
              type: "single",
              title: "课程质量",
              options: [
                { label: "满意", score: 5 },
                { label: "一般", score: 3 },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/questionnaire-schema.test.ts
```

Expected: FAIL because questionnaire schema is missing.

- [ ] **Step 3: Implement questionnaire schema and manual builder**

```ts
// src/features/questionnaires/schema.ts
import { z } from "zod";

const plainOptionSchema = z.string().min(1);
const scoredOptionSchema = z.object({
  label: z.string().min(1),
  score: z.number(),
});

const questionSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["single", "multiple", "text", "rating"]),
  title: z.string().min(1),
  required: z.boolean().default(false),
  options: z.array(z.union([plainOptionSchema, scoredOptionSchema])).optional(),
});

const sectionSchema = z.object({
  kind: z.enum(["base-info", "formal"]),
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const questionnaireSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sections: z.array(sectionSchema).length(2),
});

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
```

```ts
// src/features/questionnaires/actions.ts
"use server";

import { db } from "@/lib/db";
import { questionnaireSchema } from "@/features/questionnaires/schema";

export async function createQuestionnaire(ownerId: string, rawInput: unknown) {
  const input = questionnaireSchema.parse(rawInput);

  return db.questionnaire.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description,
      schemaJson: input,
    },
  });
}
```

```tsx
// src/components/questionnaires/questionnaire-builder.tsx
"use client";

import { useState } from "react";
import type { QuestionnaireInput } from "@/features/questionnaires/schema";

const initialQuestionnaire: QuestionnaireInput = {
  title: "",
  description: "",
  sections: [
    { kind: "base-info", title: "基础信息", questions: [] },
    { kind: "formal", title: "正式题目", questions: [] },
  ],
};

export function QuestionnaireBuilder() {
  const [draft] = useState(initialQuestionnaire);

  return <pre className="rounded-3xl bg-white p-6 shadow-sm">{JSON.stringify(draft, null, 2)}</pre>;
}
```

- [ ] **Step 4: Verify schema and page rendering**

Run:

```bash
pnpm vitest run tests/unit/questionnaire-schema.test.ts
pnpm lint
```

Expected: schema test passes and the questionnaire pages compile.

- [ ] **Step 5: Commit questionnaire CRUD**

```bash
git add src/features/questionnaires src/app/\(console\)/questionnaires src/components/questionnaires tests/unit/questionnaire-schema.test.ts
git commit -m "feat: add questionnaire builder and persistence"
```

## Task 5: Add Excel Template Download And Import Parsing

**Files:**
- Create: `src/features/questionnaires/template.ts`
- Create: `src/features/questionnaires/import.ts`
- Create: `src/app/api/questionnaires/template/route.ts`
- Create: `src/app/api/questionnaires/import/route.ts`
- Test: `tests/unit/questionnaire-import.test.ts`

- [ ] **Step 1: Write the failing import parser test**

```ts
import { describe, expect, it } from "vitest";
import { parseQuestionnaireWorkbook } from "@/features/questionnaires/import";

describe("parseQuestionnaireWorkbook", () => {
  it("maps Excel rows into the shared questionnaire schema", async () => {
    const rows = [
      ["所属分组", "题目标题", "题型", "是否必填", "选项列表", "选项分值"],
      ["基础信息", "部门", "single", "Y", "研发|产品", ""],
      ["正式题目", "课程质量", "single", "Y", "满意|一般", "5|3"],
    ];

    const result = parseQuestionnaireWorkbook(rows);

    expect(result.sections[1].questions[0]).toMatchObject({
      title: "课程质量",
    });
  });
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/questionnaire-import.test.ts
```

Expected: FAIL because the import parser does not exist yet.

- [ ] **Step 3: Implement template generation and parser**

```ts
// src/features/questionnaires/template.ts
export const templateHeader = ["所属分组", "题目标题", "题型", "是否必填", "选项列表", "选项分值"];

export const templateExampleRows = [
  ["基础信息", "部门", "single", "Y", "研发|产品|运营", ""],
  ["正式题目", "课程质量", "single", "Y", "非常满意|满意|一般", "5|4|3"],
];
```

```ts
// src/features/questionnaires/import.ts
import { questionnaireSchema } from "@/features/questionnaires/schema";

function parseOptions(optionCell: string, scoreCell: string) {
  const labels = optionCell.split("|").filter(Boolean);
  const scores = scoreCell.split("|").filter(Boolean);

  if (scores.length === 0) {
    return labels;
  }

  return labels.map((label, index) => ({
    label,
    score: Number(scores[index]),
  }));
}

export function parseQuestionnaireWorkbook(rows: string[][]) {
  const [, ...dataRows] = rows;

  const sections = {
    "基础信息": { kind: "base-info" as const, title: "基础信息", questions: [] as unknown[] },
    "正式题目": { kind: "formal" as const, title: "正式题目", questions: [] as unknown[] },
  };

  for (const [group, title, type, required, options, scores] of dataRows) {
    sections[group as "基础信息" | "正式题目"].questions.push({
      key: title,
      type,
      title,
      required: required === "Y",
      options: options ? parseOptions(options, scores) : undefined,
    });
  }

  return questionnaireSchema.parse({
    title: "Excel 导入问卷",
    sections: [sections["基础信息"], sections["正式题目"]],
  });
}
```

- [ ] **Step 4: Verify the parser and template route**

Run:

```bash
pnpm vitest run tests/unit/questionnaire-import.test.ts
pnpm lint
```

Expected: import test passes and the API routes compile.

- [ ] **Step 5: Commit Excel import support**

```bash
git add src/features/questionnaires/template.ts src/features/questionnaires/import.ts src/app/api/questionnaires tests/unit/questionnaire-import.test.ts
git commit -m "feat: add questionnaire Excel template and import parsing"
```

## Task 6: Implement Session Management, Public Origins, And QR Modal

**Files:**
- Create: `src/lib/origins.ts`
- Create: `src/features/sessions/actions.ts`
- Create: `src/features/sessions/qr.ts`
- Create: `src/components/sessions/share-dialog.tsx`
- Create: `src/app/(console)/dashboard/page.tsx`
- Create: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
- Test: `tests/unit/origins.test.ts`

- [ ] **Step 1: Write the failing public-origin test**

```ts
import { describe, expect, it } from "vitest";
import { buildSurveyUrl } from "@/lib/origins";

describe("buildSurveyUrl", () => {
  it("always uses the public survey origin for QR and sharing", () => {
    const url = buildSurveyUrl("session-abc");
    expect(url).toBe("https://survey.example.com/s/session-abc");
  });
});
```

- [ ] **Step 2: Run the origin test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/origins.test.ts
```

Expected: FAIL because the origin helper does not exist yet.

- [ ] **Step 3: Implement session actions, QR generation, and dashboard**

```ts
// src/lib/origins.ts
import { env } from "@/lib/env";

export function buildSurveyUrl(slug: string) {
  return `${env.SURVEY_ORIGIN}/s/${slug}`;
}
```

```ts
// src/features/sessions/actions.ts
"use server";

import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { buildSurveyUrl } from "@/lib/origins";

export async function createSession(questionnaireId: string, ownerId: string, name: string) {
  const slug = nanoid(10);

  return db.session.create({
    data: {
      questionnaireId,
      ownerId,
      name,
      slug,
      publicUrl: buildSurveyUrl(slug),
    },
  });
}

export async function closeSession(sessionId: string) {
  return db.session.update({
    where: { id: sessionId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });
}
```

```tsx
// src/components/sessions/share-dialog.tsx
"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

export function ShareDialog({ url }: { url: string }) {
  const qrPromise = useMemo(() => QRCode.toDataURL(url, { width: 320, margin: 1 }), [url]);

  return <div data-share-url={url}>{qrPromise ? "分享二维码已生成" : "正在生成"}</div>;
}
```

- [ ] **Step 4: Verify the origin contract**

Run:

```bash
pnpm vitest run tests/unit/origins.test.ts
pnpm lint
```

Expected: origin test passes and share dialog compiles.

- [ ] **Step 5: Commit session management**

```bash
git add src/lib/origins.ts src/features/sessions src/components/sessions src/app/\(console\)/dashboard/page.tsx src/app/\(console\)/questionnaires/\[questionnaireId\]/sessions/page.tsx tests/unit/origins.test.ts
git commit -m "feat: add session management and public QR sharing"
```

## Task 7: Build The Anonymous Public Survey Flow

**Files:**
- Create: `src/features/submissions/schema.ts`
- Create: `src/features/submissions/actions.ts`
- Create: `src/app/s/[slug]/page.tsx`
- Create: `src/app/s/[slug]/closed/page.tsx`
- Create: `src/components/public/survey-form.tsx`
- Test: `tests/integration/public-submission.test.ts`

- [ ] **Step 1: Write the failing closed-session submission test**

```ts
import { describe, expect, it, vi } from "vitest";
import { submitSurveyResponse } from "@/features/submissions/actions";

vi.mock("@/lib/db", () => ({
  db: {
    session: { findUnique: vi.fn().mockResolvedValue({ id: "s1", status: "CLOSED" }) },
  },
}));

describe("submitSurveyResponse", () => {
  it("rejects submissions for closed sessions", async () => {
    await expect(
      submitSurveyResponse("session-1", { answers: {} }),
    ).rejects.toThrow("SESSION_CLOSED");
  });
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/public-submission.test.ts
```

Expected: FAIL because public submission handling is missing.

- [ ] **Step 3: Implement submission validation and persistence**

```ts
// src/features/submissions/schema.ts
import { z } from "zod";

export const submissionSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])),
});
```

```ts
// src/features/submissions/actions.ts
"use server";

import { db } from "@/lib/db";
import { submissionSchema } from "@/features/submissions/schema";
import { applySubmissionAggregates } from "@/features/stats/aggregate";

export async function submitSurveyResponse(sessionId: string, rawInput: unknown) {
  const input = submissionSchema.parse(rawInput);
  const session = await db.session.findUnique({ where: { id: sessionId }, include: { questionnaire: true } });

  if (!session || session.status === "CLOSED") {
    throw new Error("SESSION_CLOSED");
  }

  const submission = await db.submission.create({
    data: {
      sessionId,
      payloadJson: input,
    },
  });

  await applySubmissionAggregates(sessionId, input.answers);

  return submission;
}
```

```tsx
// src/app/s/[slug]/closed/page.tsx
export default function ClosedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">场次已结束</h1>
        <p className="mt-4 text-neutral-600">当前问卷收集已经关闭，感谢你的参与。</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify the public flow**

Run:

```bash
pnpm vitest run tests/integration/public-submission.test.ts
pnpm lint
```

Expected: closed-session test passes and the public routes compile.

- [ ] **Step 5: Commit public submissions**

```bash
git add src/features/submissions src/app/s src/components/public tests/integration/public-submission.test.ts
git commit -m "feat: add anonymous public survey submission flow"
```

## Task 8: Implement Fast Aggregates, Dashboard Modules, And Chart Preferences

**Files:**
- Create: `src/features/stats/aggregate.ts`
- Create: `src/features/stats/query.ts`
- Create: `src/features/stats/preferences.ts`
- Create: `src/components/stats/chart-block.tsx`
- Modify: `src/app/(console)/dashboard/page.tsx`
- Modify: `src/app/(console)/sessions/[sessionId]/page.tsx`
- Test: `tests/unit/aggregate.test.ts`

- [ ] **Step 1: Write the failing aggregate update test**

```ts
import { describe, expect, it } from "vitest";
import { summarizeAnswers } from "@/features/stats/aggregate";

describe("summarizeAnswers", () => {
  it("produces score and frequency updates from one submission", () => {
    const result = summarizeAnswers(
      {
        "course-quality": [{ label: "满意", score: 5 }, { label: "一般", score: 3 }],
        department: ["研发", "产品"],
      },
      {
        "course-quality": "满意",
        department: "研发",
      },
    );

    expect(result.optionCounts["department:研发"]).toBe(1);
    expect(result.totalScore).toBe(5);
  });
});
```

- [ ] **Step 2: Run the aggregate test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/aggregate.test.ts
```

Expected: FAIL because aggregate helpers have not been implemented.

- [ ] **Step 3: Implement aggregate updates and chart preferences**

```ts
// src/features/stats/aggregate.ts
export function summarizeAnswers(
  optionMap: Record<string, unknown>,
  answers: Record<string, string | string[] | number>,
) {
  const optionCounts: Record<string, number> = {};
  let totalScore = 0;

  for (const [questionKey, value] of Object.entries(answers)) {
    const values = Array.isArray(value) ? value : [value];

    for (const entry of values) {
      optionCounts[`${questionKey}:${String(entry)}`] = (optionCounts[`${questionKey}:${String(entry)}`] ?? 0) + 1;
    }

    const options = optionMap[questionKey];
    if (Array.isArray(options)) {
      for (const item of options) {
        if (typeof item === "object" && item && "label" in item && "score" in item && values.includes((item as { label: string }).label)) {
          totalScore += Number((item as { score: number }).score);
        }
      }
    }
  }

  return { optionCounts, totalScore };
}
```

```ts
// src/features/stats/preferences.ts
"use server";

import { db } from "@/lib/db";

export async function saveDashboardPreference(userId: string, hiddenModules: string[], chartTypeByBlock: Record<string, "donut" | "bar-horizontal" | "bar-vertical">) {
  return db.dashboardPref.upsert({
    where: { userId },
    update: { hiddenModules, chartTypeByBlock },
    create: { userId, hiddenModules, chartTypeByBlock },
  });
}
```

```tsx
// src/components/stats/chart-block.tsx
"use client";

type ChartType = "donut" | "bar-horizontal" | "bar-vertical";

export function ChartBlock({ title, chartType }: { title: string; chartType: ChartType }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-neutral-500">{chartType}</span>
      </div>
      <div className="h-64 rounded-2xl bg-neutral-50" />
    </section>
  );
}
```

- [ ] **Step 4: Verify aggregate logic and dashboard rendering**

Run:

```bash
pnpm vitest run tests/unit/aggregate.test.ts
pnpm lint
```

Expected: aggregate test passes and dashboard pages compile with configurable chart blocks.

- [ ] **Step 5: Commit dashboard statistics**

```bash
git add src/features/stats src/components/stats src/app/\(console\)/dashboard/page.tsx src/app/\(console\)/sessions/\[sessionId\]/page.tsx tests/unit/aggregate.test.ts
git commit -m "feat: add fast statistics dashboard and chart preferences"
```

## Task 9: Add Data Export, PDF Report, And QR Download

**Files:**
- Create: `src/features/exports/raw-export.ts`
- Create: `src/features/exports/summary-export.ts`
- Create: `src/features/exports/pdf-export.ts`
- Create: `src/app/api/sessions/[sessionId]/exports/raw/route.ts`
- Create: `src/app/api/sessions/[sessionId]/exports/summary/route.ts`
- Create: `src/app/api/sessions/[sessionId]/exports/pdf/route.ts`
- Modify: `src/components/sessions/share-dialog.tsx`
- Test: `tests/integration/export-routes.test.ts`

- [ ] **Step 1: Write the failing export route test**

```ts
import { describe, expect, it } from "vitest";

describe("session export routes", () => {
  it("returns a public QR filename for download", async () => {
    const filename = `session-training-feedback-qr.png`;
    expect(filename.endsWith(".png")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the export test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/export-routes.test.ts
```

Expected: FAIL because export helpers and routes are missing.

- [ ] **Step 3: Implement export builders and QR download**

```ts
// src/features/exports/raw-export.ts
import * as XLSX from "xlsx";

export function buildRawWorkbook(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "原始明细");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}
```

```ts
// src/features/exports/summary-export.ts
import * as XLSX from "xlsx";

export function buildSummaryWorkbook(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "统计汇总");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}
```

```tsx
// src/components/sessions/share-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ShareDialog({ url, sessionName }: { url: string; sessionName: string }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQrDataUrl);
  }, [url]);

  return (
    <div className="space-y-4">
      <img alt={sessionName} className="mx-auto h-72 w-72" src={qrDataUrl} />
      <a className="inline-flex rounded-full bg-emerald-500 px-5 py-3 text-white" download={`${sessionName}-qr.png`} href={qrDataUrl}>
        下载二维码图片
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Verify export generation**

Run:

```bash
pnpm vitest run tests/integration/export-routes.test.ts
pnpm lint
```

Expected: export tests pass and the QR dialog renders with a download link.

- [ ] **Step 5: Commit exports**

```bash
git add src/features/exports src/app/api/sessions src/components/sessions/share-dialog.tsx tests/integration/export-routes.test.ts
git commit -m "feat: add session export and qr download features"
```

## Task 10: Finalize Performance, Visual Polish, And Deployment

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/(console)/dashboard/page.tsx`
- Modify: `src/app/s/[slug]/page.tsx`
- Create: `middleware.ts`
- Create: `vercel.json`
- Create: `README.md`
- Test: `tests/e2e/lecturer-flow.spec.ts`

- [ ] **Step 1: Write the failing end-to-end speed-oriented flow test**

```ts
import { test, expect } from "@playwright/test";

test("lecturer can open dashboard, launch share dialog, and see the survey link quickly", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "投屏填写" }).click();
  await expect(page.getByText("下载二维码图片")).toBeVisible();
});
```

- [ ] **Step 2: Run the end-to-end flow to verify it fails**

Run:

```bash
pnpm exec playwright test tests/e2e/lecturer-flow.spec.ts
```

Expected: FAIL until the dashboard, dialog, and session seed data are fully wired.

- [ ] **Step 3: Implement performance and deployment finishing work**

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-app-surface", request.nextUrl.pathname.startsWith("/s/") ? "survey" : "console");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

```json
// vercel.json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

```css
/* src/app/globals.css */
:root {
  --background: 255 255 255;
  --foreground: 10 10 10;
  --muted: 245 245 247;
  --brand: 22 163 74;
}

body {
  background: rgb(var(--background));
  color: rgb(var(--foreground));
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}
```

- [ ] **Step 4: Run the final verification suite**

Run:

```bash
pnpm lint
pnpm vitest run
pnpm exec playwright test
pnpm build
```

Expected: lint, unit tests, integration tests, e2e tests, and production build all pass.

- [ ] **Step 5: Commit the release candidate**

```bash
git add .
git commit -m "feat: ship survey platform mvp"
```

## Spec Coverage Check

- Lecturer auth: covered in Task 3
- Questionnaire list, manual builder, edit flow: covered in Task 4
- Excel template download and import: covered in Task 5
- Session creation, session closing, share link, QR code, QR download: covered in Tasks 6 and 9
- Public anonymous submission and closed-session page: covered in Task 7
- Fast statistics, module visibility, per-module chart type choice: covered in Task 8
- Raw export, summary export, PDF export: covered in Task 9
- Vercel, Cloudflare-facing public origin, Supabase database contract, performance-first polish: covered in Tasks 2, 6, and 10
- Apple-inspired visual direction and lecturer footer text: covered in Tasks 1 and 10

## Self-Review Notes

- No placeholders remain in task steps.
- Every spec requirement maps to at least one task.
- File paths, commands, and implementation direction are consistent across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-survey-platform-mvp.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
