export const chartTypes = [
  "donut",
  "bar-horizontal",
  "bar-vertical",
] as const;

export type ChartType = (typeof chartTypes)[number];

export const dashboardModules = [
  { key: "session-overview", label: "场次基础信息" },
  { key: "response-overview", label: "回收概览" },
  { key: "score-summary", label: "计分汇总" },
  { key: "base-info", label: "基础信息字段统计" },
  { key: "formal-questions", label: "正式题目统计" },
  { key: "text-feedback", label: "文本题明细" },
] as const;

export type DashboardModuleKey = (typeof dashboardModules)[number]["key"];

export type DashboardPreference = {
  hiddenModules: DashboardModuleKey[];
  chartTypeByBlock: Record<string, ChartType>;
};

function isDashboardModuleKey(value: string): value is DashboardModuleKey {
  return dashboardModules.some((module) => module.key === value);
}

function isChartType(value: string): value is ChartType {
  return chartTypes.includes(value as ChartType);
}

export function normalizeDashboardPreference(input?: {
  hiddenModules?: unknown;
  chartTypeByBlock?: unknown;
} | null): DashboardPreference {
  const rawHiddenModules = Array.isArray(input?.hiddenModules)
    ? input.hiddenModules
    : [];
  const hiddenModules = rawHiddenModules
    .map((moduleKey) => String(moduleKey))
    .filter(isDashboardModuleKey);

  const rawChartTypeByBlock =
    input?.chartTypeByBlock && typeof input.chartTypeByBlock === "object"
      ? input.chartTypeByBlock
      : {};
  const chartTypeByBlock: Record<string, ChartType> = {};

  for (const [blockId, value] of Object.entries(rawChartTypeByBlock)) {
    const normalizedValue = String(value);
    if (blockId && isChartType(normalizedValue)) {
      chartTypeByBlock[blockId] = normalizedValue;
    }
  }

  return {
    hiddenModules,
    chartTypeByBlock,
  };
}

export function getChartTypeForBlock(
  preference: DashboardPreference,
  blockId: string,
  fallback: ChartType = "donut",
) {
  return preference.chartTypeByBlock[blockId] ?? fallback;
}

export function parseDashboardPreferenceFormData(formData: FormData) {
  const visibleModules = formData
    .getAll("visibleModules")
    .map((value) => String(value));
  const hiddenModules = dashboardModules
    .map((module) => module.key)
    .filter((moduleKey) => !visibleModules.includes(moduleKey));
  const chartTypeByBlock: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("chartType:")) {
      continue;
    }

    const blockId = key.replace("chartType:", "");
    chartTypeByBlock[blockId] = String(value);
  }

  return normalizeDashboardPreference({
    hiddenModules,
    chartTypeByBlock,
  });
}

export async function getDashboardPreference(userId: string) {
  const { db } = await import("@/lib/db");
  const preference = await db.dashboardPref.findUnique({
    where: { userId },
    select: {
      hiddenModules: true,
      chartTypeByBlock: true,
    },
  });

  return normalizeDashboardPreference(preference);
}

export async function saveDashboardPreference(
  userId: string,
  hiddenModulesInput: unknown,
  chartTypeByBlockInput: unknown,
) {
  const { db } = await import("@/lib/db");
  const preference = normalizeDashboardPreference({
    hiddenModules: hiddenModulesInput,
    chartTypeByBlock: chartTypeByBlockInput,
  });

  return db.dashboardPref.upsert({
    where: { userId },
    update: {
      hiddenModules: preference.hiddenModules,
      chartTypeByBlock: preference.chartTypeByBlock,
    },
    create: {
      userId,
      hiddenModules: preference.hiddenModules,
      chartTypeByBlock: preference.chartTypeByBlock,
    },
  });
}
