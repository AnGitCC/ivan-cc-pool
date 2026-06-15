# Pre-release Checklist

- 配置 `DATABASE_URL` 为 Supabase Session Pooler 地址，供应用运行时使用。
- 配置 `DIRECT_DATABASE_URL` 为 Supabase 直连地址，供 Prisma schema 同步或管理动作使用。
- 配置 `AUTH_SECRET` 与 `NEXTAUTH_URL`，确保后台登录态与回跳域名正确。
- 配置 `CONSOLE_ORIGIN` 为讲师后台域名。
- 配置 `SURVEY_ORIGIN` 为 Cloudflare 代理后的员工填写域名。
- 校验二维码、分享链接和公开填写入口都落到 `SURVEY_ORIGIN`。
- 回归 `/login`、`/questionnaires`、`/questionnaires/[id]/sessions`、`/sessions/[id]`、`/s/[slug]`、`/s/[slug]/closed`。
- 验证讲师登录、退出登录、创建问卷、Excel 导入、手工建卷、创建场次、关闭场次、删除空问卷、删除场次、查看统计与导出。
- 确认预发布环境 `pnpm run lint`、`pnpm run test`、`pnpm run build` 全部通过。
