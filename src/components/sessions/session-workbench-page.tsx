import Link from "next/link";
import { SessionSwitcher } from "@/components/sessions/session-switcher";
import { ShareDialog } from "@/components/sessions/share-dialog";
import { SessionStatisticsPanel } from "@/components/stats/session-statistics-panel";
import type { DashboardPreference } from "@/features/stats/preferences";
import type { SessionStatistics } from "@/features/stats/query";

function formatDate(date: Date | null, emptyLabel = "未关闭") {
  if (!date) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPublicOrigin(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function WorkbenchMetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">{label}</p>
      <p className="mt-4 text-lg font-semibold tracking-tight text-neutral-950">
        {value}
      </p>
    </div>
  );
}

export const sessionWorkbenchE2eSessionId = "e2e-session";
export const sessionWorkbenchE2eClosedSessionId = "e2e-session-closed";
export const sessionWorkbenchE2eOtherQuestionnaireSessionId =
  "e2e-session-other-questionnaire";

export const sessionWorkbenchE2eSessionOptions = [
  {
    id: sessionWorkbenchE2eSessionId,
    name: "新员工培训满意度回收",
    status: "ACTIVE" as const,
    questionnaireId: "e2e-questionnaire",
  },
  {
    id: sessionWorkbenchE2eClosedSessionId,
    name: "第二场培训复盘",
    status: "CLOSED" as const,
    questionnaireId: "e2e-questionnaire",
  },
  {
    id: sessionWorkbenchE2eOtherQuestionnaireSessionId,
    name: "讲师沟通反馈回收",
    status: "ACTIVE" as const,
    questionnaireId: "e2e-questionnaire-alt",
  },
];

export const sessionWorkbenchE2eStatistics: SessionStatistics = {
  session: {
    id: sessionWorkbenchE2eSessionId,
    name: "新员工培训满意度回收",
    status: "ACTIVE",
    publicUrl: "https://join.example.com/s/e2eslug01",
    createdAt: new Date("2026-06-14T09:00:00.000Z"),
    closedAt: null,
    questionnaireId: "e2e-questionnaire",
    questionnaireTitle: "培训反馈问卷",
  },
  responseOverview: {
    submissionCount: 128,
    lastSubmittedAt: new Date("2026-06-14T10:20:00.000Z"),
  },
  scoreSummary: {
    submissionCount: 120,
    totalScore: 1045,
    averageScore: 8.71,
    distribution: [
      { label: "6", value: 8, percentage: 8 / 120 },
      { label: "7", value: 24, percentage: 24 / 120 },
      { label: "8", value: 41, percentage: 41 / 120 },
      { label: "9", value: 33, percentage: 33 / 120 },
      { label: "10", value: 14, percentage: 14 / 120 },
    ],
  },
  baseInfoQuestions: [
    {
      blockId: "question:campus",
      questionKey: "campus",
      title: "所在校区",
      questionType: "single",
      answeredCount: 128,
      averageScore: null,
      data: [
        { label: "上海", value: 52, percentage: 52 / 128 },
        { label: "深圳", value: 44, percentage: 44 / 128 },
        { label: "北京", value: 32, percentage: 32 / 128 },
      ],
    },
  ],
  formalQuestions: [
    {
      blockId: "question:content-score",
      questionKey: "content-score",
      title: "培训内容是否清晰实用",
      questionType: "rating",
      answeredCount: 120,
      averageScore: 8.9,
      data: [
        { label: "6", value: 9, percentage: 9 / 120 },
        { label: "7", value: 22, percentage: 22 / 120 },
        { label: "8", value: 36, percentage: 36 / 120 },
        { label: "9", value: 35, percentage: 35 / 120 },
        { label: "10", value: 18, percentage: 18 / 120 },
      ],
    },
  ],
  textQuestions: [
    {
      questionKey: "suggestion",
      title: "你最希望下次补充的内容",
      answers: [
        "希望增加更多实际业务案例。",
        "建议保留扫码即填的体验，现场回收更顺畅。",
      ],
    },
  ],
};

const sessionWorkbenchE2eClosedStatistics: SessionStatistics = {
  ...sessionWorkbenchE2eStatistics,
  session: {
    ...sessionWorkbenchE2eStatistics.session,
    id: sessionWorkbenchE2eClosedSessionId,
    name: "第二场培训复盘",
    status: "CLOSED",
    publicUrl: "https://join.example.com/s/e2eslug02",
    closedAt: new Date("2026-06-14T11:30:00.000Z"),
  },
  responseOverview: {
    submissionCount: 96,
    lastSubmittedAt: new Date("2026-06-14T11:10:00.000Z"),
  },
};

const sessionWorkbenchE2eStatisticsById: Record<string, SessionStatistics> = {
  [sessionWorkbenchE2eSessionId]: sessionWorkbenchE2eStatistics,
  [sessionWorkbenchE2eClosedSessionId]: sessionWorkbenchE2eClosedStatistics,
};

export function getSessionWorkbenchE2eStatistics(sessionId: string) {
  return sessionWorkbenchE2eStatisticsById[sessionId] ?? null;
}

type SessionWorkbenchPageProps = {
  closeSessionAction: (formData: FormData) => Promise<void>;
  preference: DashboardPreference;
  savePreferenceAction: (formData: FormData) => Promise<void>;
  sessionOptions: Array<{
    id: string;
    name: string;
    status: "ACTIVE" | "CLOSED";
  }>;
  showDashboardLink?: boolean;
  statistics: SessionStatistics;
};

export function SessionWorkbenchPage({
  closeSessionAction,
  preference,
  savePreferenceAction,
  sessionOptions,
  showDashboardLink = false,
  statistics,
}: SessionWorkbenchPageProps) {
  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">
            Session Workbench
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
            场次工作台
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            把投屏填写、导出入口、场次状态与统计配置收口在同一页面，方便讲师在授课现场快速切换操作。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <SessionSwitcher
            currentSessionId={statistics.session.id}
            sessions={sessionOptions}
          />
          <ShareDialog
            sessionName={statistics.session.name}
            url={statistics.session.publicUrl}
          />
          <a
            className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-5 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
            href={`/api/sessions/${statistics.session.id}/exports/raw`}
          >
            导出原始明细
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-5 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"
            href={`/api/sessions/${statistics.session.id}/exports/summary`}
          >
            导出统计汇总
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            href={`/api/sessions/${statistics.session.id}/exports/pdf`}
          >
            导出 PDF 报告
          </a>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
            href={`/questionnaires/${statistics.session.questionnaireId}/sessions`}
          >
            返回场次管理
          </Link>
          {showDashboardLink ? (
            <Link
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
              href="/dashboard"
            >
              返回工作台首页
            </Link>
          ) : null}
          {statistics.session.status === "ACTIVE" ? (
            <form action={closeSessionAction}>
              <input name="sessionId" type="hidden" value={statistics.session.id} />
              <button
                className="inline-flex items-center justify-center rounded-full border border-red-200 px-5 py-3 text-sm font-medium text-red-600 transition hover:border-red-300 hover:text-red-700"
                type="submit"
              >
                关闭场次
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <article className="rounded-[40px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    statistics.session.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {statistics.session.status === "ACTIVE" ? "进行中" : "已关闭"}
                </span>
                <span className="text-xs text-neutral-500">
                  问卷：{statistics.session.questionnaireTitle}
                </span>
              </div>

              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
                {statistics.session.name}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600">
                当前填写链接已绑定员工可访问的公网域名，适合直接投屏展示二维码或将链接分享至培训群。
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-neutral-600">
                <span>创建于 {formatDate(statistics.session.createdAt, "暂无")}</span>
                <span>关闭于 {formatDate(statistics.session.closedAt)}</span>
              </div>
              <a
                className="mt-6 block break-all text-sm leading-6 text-emerald-700"
                href={statistics.session.publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                {statistics.session.publicUrl}
              </a>
            </div>
          </div>
        </article>

        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <WorkbenchMetricCard
            label="回收量"
            value={statistics.responseOverview.submissionCount}
          />
          <WorkbenchMetricCard
            label="最近提交"
            value={formatDate(statistics.responseOverview.lastSubmittedAt, "暂无")}
          />
          <WorkbenchMetricCard
            label="填写域名"
            value={formatPublicOrigin(statistics.session.publicUrl)}
          />
          <WorkbenchMetricCard
            label="当前状态"
            value={
              statistics.session.status === "ACTIVE" ? "正在回收反馈" : "场次已结束"
            }
          />
        </aside>
      </div>

      <SessionStatisticsPanel
        preference={preference}
        savePreferenceAction={savePreferenceAction}
        statistics={statistics}
      />
    </section>
  );
}
