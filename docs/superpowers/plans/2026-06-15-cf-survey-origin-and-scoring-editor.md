# 填写域名（Cloudflare）与计分编辑补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让二维码/分享链接稳定指向 Cloudflare（workers.dev）填写域名；修复创建场次按钮换行；补齐问卷编辑器的“选项分值”编辑能力（单选/多选）。

**Architecture:** 填写页域名通过 `SURVEY_ORIGIN` 控制；Cloudflare Worker 作为反向代理把 `/s/*` 等请求转发到 Vercel 生产站点；问卷计分沿用现有 schema（选项级 `{label, score}`）并在编辑器暴露 UI。

**Tech Stack:** Next.js App Router、TypeScript、Tailwind、Prisma、Vercel、Cloudflare Workers（wrangler）

---

## 文件结构与改动面

**Cloudflare**
- Create: `cloudflare/survey-proxy/wrangler.toml`
- Create: `cloudflare/survey-proxy/src/index.ts`

**Web App**
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`
- Modify: `src/components/questionnaires/questionnaire-builder.tsx`
- Modify: `src/lib/env.ts`（如果需要放宽/调整校验）
- Modify: `package.json`（已合入：`build` 前执行 `prisma generate`）
- Modify: `prisma.config.ts`（已合入：构建期 env 加载）

**Tests**
- Modify: `tests/unit/questionnaire-builder.test.tsx`

---

### Task 1: 创建 Cloudflare Worker 反向代理（workers.dev）

**Files:**
- Create: `cloudflare/survey-proxy/wrangler.toml`
- Create: `cloudflare/survey-proxy/src/index.ts`

- [ ] **Step 1: 新增 wrangler 项目文件**

`cloudflare/survey-proxy/wrangler.toml`

```toml
name = "an-survey-survey-proxy"
main = "src/index.ts"
compatibility_date = "2026-06-15"
```

`cloudflare/survey-proxy/src/index.ts`

```ts
const ORIGIN = "https://an-survey-platform.vercel.app";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);

    const forwarded = new Request(target, request);
    forwarded.headers.set("host", target.host);
    forwarded.headers.set("x-forwarded-host", url.host);
    forwarded.headers.set("x-forwarded-proto", "https");

    return fetch(forwarded);
  },
};
```

- [ ] **Step 2: 登录 Cloudflare（需要你在浏览器完成授权）**

Run:

```bash
pnpm dlx wrangler@latest login
```

Expected: 打开浏览器，确认授权后回到终端显示登录成功。

- [ ] **Step 3: 部署 Worker 并拿到 workers.dev 域名**

Run:

```bash
pnpm dlx wrangler@latest deploy --cwd cloudflare/survey-proxy
```

Expected: 输出一个 `https://<worker-name>.<account>.workers.dev` 的访问地址。

- [ ] **Step 4: 快速验证 Worker 可访问**

Run:

```bash
curl -I https://<worker-domain>/s/test
```

Expected: 至少能返回 `200/404`（取决于 slug 是否存在），但不应是 Cloudflare 的 1101/1102 等报错页。

---

### Task 2: 配置 SURVEY_ORIGIN 指向 workers.dev（Vercel 生产环境）

**Files:**
- Modify:（无代码文件变更，修改 Vercel 环境变量）

- [ ] **Step 1: 设置 SURVEY_ORIGIN 为 Worker 域名**

Run:

```bash
vercel env rm SURVEY_ORIGIN production -y
printf "https://<worker-domain>" | vercel env add SURVEY_ORIGIN production
```

Expected: `Added Environment Variable SURVEY_ORIGIN ...`

- [ ] **Step 2: 触发一次生产重部署（让新 env 生效）**

Run:

```bash
vercel deploy --prod --yes
```

Expected: `Ready` 并完成 alias。

---

### Task 3: 修复“创建场次”按钮换行

**Files:**
- Modify: `src/app/(console)/questionnaires/[questionnaireId]/sessions/page.tsx`

- [ ] **Step 1: 写一个最小 UI 断言（可选）**

如果项目当前没有对该页面做 UI 单测，可跳过本步；否则为该按钮新增 `whitespace-nowrap` 的快照/断言。

- [ ] **Step 2: 调整表单布局**

修改创建场次 form：
- 输入框：`w-full` → `flex-1`
- 按钮：增加 `shrink-0 whitespace-nowrap`

- [ ] **Step 3: 本地验证**

Run:

```bash
pnpm run build
```

并在浏览器访问：`/questionnaires/<id>/sessions`，观察按钮是否保持单行。

---

### Task 4: 问卷编辑器补齐“选项分值”编辑（单选/多选，正式题）

**Files:**
- Modify: `src/components/questionnaires/questionnaire-builder.tsx`
- Modify: `tests/unit/questionnaire-builder.test.tsx`

- [ ] **Step 1: 先写失败的单测（TDD）**

在 `tests/unit/questionnaire-builder.test.tsx` 新增用例：

```ts
it("edits option score for a scored question", () => {
  render(<QuestionnaireBuilder mode="create" submitAction={vi.fn()} />);

  fireEvent.click(screen.getAllByRole("button", { name: "添加题目" })[1]);
  fireEvent.change(screen.getAllByLabelText("题目标题").at(-1)!, {
    target: { value: "课程满意度" },
  });

  fireEvent.change(screen.getAllByLabelText("题型").at(-1)!, {
    target: { value: "single" },
  });

  fireEvent.change(screen.getByLabelText("选项 1 文案"), {
    target: { value: "非常满意" },
  });
  fireEvent.change(screen.getByLabelText("选项 1 分值"), {
    target: { value: "10" },
  });

  const draftInput = document.querySelector('input[name="draftJson"]');
  expect(draftInput).toBeTruthy();
  const parsed = JSON.parse((draftInput as HTMLInputElement).value);

  expect(parsed.sections[1].questions.at(-1).options[0]).toEqual({
    label: "非常满意",
    score: 10,
  });
});
```

说明：
- 该测试依赖编辑器为选项输入框提供稳定的 `aria-label`（如“选项 1 分值”）。
- `draftJson` 是 hidden input，需要在实现里确保可被测试读取（必要时给 input 增加 `aria-label="draftJson"` 并在测试中用 `getByLabelText`）。

- [ ] **Step 2: 实现选项编辑 UI**

实现要点：
- 仅对 `section.kind !== "base-info"` 且 `question.type` 为 `single/multiple` 显示选项编辑区
- 若 `options` 中存在 `string`，在 UI 层按 `{ label: string, score: 0 }` 展示并在首次编辑时转成对象
- 提供“新增选项 / 删除选项”能力

- [ ] **Step 3: 运行单测确保通过**

Run:

```bash
pnpm run test:unit
```

Expected: PASS

- [ ] **Step 4: 端到端冒烟（手动）**

在控制台：
- 新建问卷 → 添加正式题（单选/多选）→ 配置选项分值 → 保存
- 新建场次 → 打开分享弹窗 → 扫码进入填写页 → 提交
- 返回工作台统计：总分/均分应随分值变化

---

## 自检（Plan Self-Review）

- 覆盖了：workers.dev 代理部署、Vercel 环境变量切换、按钮换行修复、分值编辑 UI 与单测。
- 无“TODO/TBD”占位要求；worker 域名由部署命令输出提供，计划中以 `<worker-domain>` 表示的是“来自命令输出”的真实值。
