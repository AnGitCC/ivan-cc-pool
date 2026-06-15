import { ChartBlock } from "@/components/stats/chart-block";
import {
  dashboardModules,
  getChartTypeForBlock,
  type DashboardPreference,
} from "@/features/stats/preferences";
import type { SessionStatistics } from "@/features/stats/query";

type SessionStatisticsPanelProps = {
  statistics: SessionStatistics;
  preference: DashboardPreference;
  savePreferenceAction: (formData: FormData) => Promise<void>;
};

function formatDate(date: Date | null) {
  if (!date) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatScore(score: number | null) {
  if (score === null) {
    return "暂无";
  }

  return Number(score.toFixed(2)).toString();
}

export function SessionStatisticsPanel({
  statistics,
  preference,
  savePreferenceAction,
}: SessionStatisticsPanelProps) {
  const hiddenModules = new Set(preference.hiddenModules);
  const chartBlocks = [
    {
      blockId: "score-distribution",
      label: "总分分布",
      fallback: "bar-vertical" as const,
    },
    ...statistics.baseInfoQuestions.map((question) => ({
      blockId: question.blockId,
      label: question.title,
      fallback: "bar-horizontal" as const,
    })),
    ...statistics.formalQuestions.map((question) => ({
      blockId: question.blockId,
      label: question.title,
      fallback: "donut" as const,
    })),
  ];

  return (
    <div className="space-y-6">
      <details className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
        <summary className="cursor-pointer list-none text-sm font-medium text-neutral-950">
          显示设置与图表配置
        </summary>

        <form action={savePreferenceAction} className="mt-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-950">显示模块</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboardModules.map((module) => (
                <label
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700"
                  key={module.key}
                >
                  <span>{module.label}</span>
                  <input
                    defaultChecked={!hiddenModules.has(module.key)}
                    name="visibleModules"
                    type="checkbox"
                    value={module.key}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-950">单模块图表类型</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {chartBlocks.map((block) => (
                <label
                  className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-700"
                  key={block.blockId}
                >
                  <span className="truncate">{block.label}</span>
                  <select
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700"
                    defaultValue={getChartTypeForBlock(
                      preference,
                      block.blockId,
                      block.fallback,
                    )}
                    name={`chartType:${block.blockId}`}
                  >
                    <option value="donut">环形饼图</option>
                    <option value="bar-horizontal">横向柱状图</option>
                    <option value="bar-vertical">竖向柱状图</option>
                  </select>
                </label>
              ))}
            </div>
          </section>

          <button
            className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            type="submit"
          >
            保存设置
          </button>
        </form>
      </details>

      {!hiddenModules.has("session-overview") ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              场次状态
            </p>
            <p className="mt-4 text-3xl font-semibold text-neutral-950">
              {statistics.session.status === "ACTIVE" ? "进行中" : "已关闭"}
            </p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              所属问卷
            </p>
            <p className="mt-4 text-lg font-semibold text-neutral-950">
              {statistics.session.questionnaireTitle}
            </p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              创建时间
            </p>
            <p className="mt-4 text-lg font-semibold text-neutral-950">
              {formatDate(statistics.session.createdAt)}
            </p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              关闭时间
            </p>
            <p className="mt-4 text-lg font-semibold text-neutral-950">
              {formatDate(statistics.session.closedAt)}
            </p>
          </div>
        </section>
      ) : null}

      {!hiddenModules.has("response-overview") ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              回收量
            </p>
            <p className="mt-4 text-4xl font-semibold text-neutral-950">
              {statistics.responseOverview.submissionCount}
            </p>
          </div>
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              最近提交
            </p>
            <p className="mt-4 text-lg font-semibold text-neutral-950">
              {formatDate(statistics.responseOverview.lastSubmittedAt)}
            </p>
          </div>
        </section>
      ) : null}

      {!hiddenModules.has("score-summary") ? (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                计分答卷数
              </p>
              <p className="mt-4 text-4xl font-semibold text-neutral-950">
                {statistics.scoreSummary.submissionCount}
              </p>
            </div>
            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                总分累计
              </p>
              <p className="mt-4 text-4xl font-semibold text-neutral-950">
                {formatScore(statistics.scoreSummary.totalScore)}
              </p>
            </div>
            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                平均总分
              </p>
              <p className="mt-4 text-4xl font-semibold text-neutral-950">
                {formatScore(statistics.scoreSummary.averageScore)}
              </p>
            </div>
          </div>

          <ChartBlock
            chartType={getChartTypeForBlock(
              preference,
              "score-distribution",
              "bar-vertical",
            )}
            data={statistics.scoreSummary.distribution}
            description="基于已计分答卷的总分分布"
            testId="chart-block-score-distribution"
            title="总分分布"
          />
        </section>
      ) : null}

      {!hiddenModules.has("base-info") && statistics.baseInfoQuestions.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              基础信息字段统计
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              展示基础信息题目的选项频次与占比。
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {statistics.baseInfoQuestions.map((question) => (
              <ChartBlock
                chartType={getChartTypeForBlock(
                  preference,
                  question.blockId,
                  "bar-horizontal",
                )}
                data={question.data}
                description={`已作答 ${question.answeredCount} 份`}
                key={question.questionKey}
                testId={`chart-block-${question.questionKey}`}
                title={question.title}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!hiddenModules.has("formal-questions") &&
      statistics.formalQuestions.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              正式题目统计
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              展示正式题目的频次分布；计分题额外展示单题平均分。
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {statistics.formalQuestions.map((question) => (
              <ChartBlock
                chartType={getChartTypeForBlock(
                  preference,
                  question.blockId,
                  "donut",
                )}
                data={question.data}
                description={`已作答 ${question.answeredCount} 份${
                  question.averageScore === null
                    ? ""
                    : `，单题均分 ${formatScore(question.averageScore)}`
                }`}
                key={question.questionKey}
                testId={`chart-block-${question.questionKey}`}
                title={question.title}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!hiddenModules.has("text-feedback") && statistics.textQuestions.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">文本题明细</h2>
            <p className="mt-2 text-sm text-neutral-600">
              按题目聚合展示最新文本反馈内容。
            </p>
          </div>

          <div className="grid gap-4">
            {statistics.textQuestions.map((question) => (
              <section
                className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm"
                key={question.questionKey}
              >
                <h3 className="text-lg font-semibold text-neutral-950">
                  {question.title}
                </h3>
                {question.answers.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-500">暂无文本反馈</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {question.answers.map((answer, index) => (
                      <div
                        className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700"
                        key={`${question.questionKey}-${index}`}
                      >
                        {answer}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
