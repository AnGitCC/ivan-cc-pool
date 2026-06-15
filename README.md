# 通用问卷调查平台 MVP

面向讲师端的高性能问卷与培训反馈平台，强调三件事：

- 讲师后台打开快、切换快、投屏分享快
- 员工扫码填写链路短、匿名、移动端友好
- 统计模块、导出能力与部署架构都围绕 MVP 交付落地

## 技术栈

- Next.js 16 App Router
- React 19
- Prisma + PostgreSQL
- NextAuth Credentials 登录
- Recharts 图表
- Vitest + Playwright 测试

## 主要页面

- `/dashboard`：讲师大屏首页，默认显示最近进行中的场次
- `/questionnaires`：问卷列表、手工新建、Excel 导入入口
- `/questionnaires/[questionnaireId]/sessions`：场次管理、投屏分享、关闭场次
- `/sessions/[sessionId]`：统计页、模块显隐、导出入口
- `/s/[slug]`：员工匿名填写页
- `/s/[slug]/closed`：场次关闭提示页

## 本地开发

1. 安装依赖

```bash
pnpm install
```

2. 配置环境变量

复制 `.env.example` 为 `.env.local`，并按实际环境填写：

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_SECRET="replace-with-a-strong-secret-at-least-16-chars"
CONSOLE_ORIGIN="https://console.example.com"
SURVEY_ORIGIN="https://survey.example.com"
NEXTAUTH_URL="https://console.example.com"
```

3. 启动开发环境

```bash
pnpm dev
```

## 常用命令

```bash
pnpm lint
pnpm run test
pnpm run test:e2e
pnpm build
```

## Deployment

1. 将 Next.js 应用部署到 Vercel，并绑定讲师后台域名。
2. 在 Cloudflare 配置员工填写域名，并代理到同一个 Vercel 项目。
3. 在 Vercel 配置 `DATABASE_URL`、`DIRECT_DATABASE_URL`、`AUTH_SECRET`、`CONSOLE_ORIGIN`、`SURVEY_ORIGIN`、`NEXTAUTH_URL`。
4. 保持 `DATABASE_URL` 使用 Session Pooler，`DIRECT_DATABASE_URL` 使用直连地址。
5. 首次部署前执行数据库 schema 同步。
6. 部署完成后，按 `docs/deployment/pre-release-checklist.md` 做预发布回归。

当前 Prisma schema 已覆盖讲师、问卷、场次、提交、聚合统计和导出任务模型，`vercel.json` 已将 `src/app/api/**/*.ts` 的函数最大执行时长设置为 `30s`。

## 性能策略

- 后台首页优先加载最近进行中场次，减少讲师进入后的判断成本
- 统计数据按场次聚合，避免大屏重复做高成本运算
- 填写页保持轻量结构，适配扫码即填与移动端快速提交
- 中间件通过 `x-app-surface` 标识请求面向 `console` 还是 `survey`，便于后续做边缘层观测与策略分流

## 测试说明

- `tests/e2e/smoke.spec.ts`：验证未登录访问后台会跳转至登录页
- `tests/e2e/lecturer-flow.spec.ts`：验证讲师可打开大屏、拉起投屏分享弹窗并看到填写链接

为保证 `lecturer-flow` 在无真实数据库种子的情况下稳定执行，该用例会自动注入测试 cookie 并启用只影响当前请求的讲师大屏夹具。运行 Playwright 时只需提供基础环境变量：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app?pgbouncer=true&connection_limit=1" \
DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app" \
AUTH_SECRET="test-secret-with-at-least-16-chars" \
CONSOLE_ORIGIN="https://console.example.com" \
SURVEY_ORIGIN="https://survey.example.com" \
NEXTAUTH_URL="https://console.example.com" \
pnpm exec playwright test
```
