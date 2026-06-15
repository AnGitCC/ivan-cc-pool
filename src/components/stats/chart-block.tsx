"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSyncExternalStore } from "react";
import type { ChartType } from "@/features/stats/preferences";
import type { ChartDatum } from "@/features/stats/query";

type ChartBlockProps = {
  title: string;
  chartType: ChartType;
  data: ChartDatum[];
  description?: string;
  testId?: string;
};

const chartColors = [
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#d1fae5",
  "#0f766e",
];

function renderValue(value: number) {
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

function renderTooltipValue(
  value?: string | number | Array<string | number> | ReadonlyArray<string | number>,
) {
  const normalizedValue = Array.isArray(value)
    ? Number(value[0])
    : Number(value ?? 0);
  return [renderValue(normalizedValue), "数量"] as const;
}

export function ChartBlock({
  title,
  chartType,
  data,
  description,
  testId,
}: ChartBlockProps) {
  const isChartReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return (
    <section
      className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm"
      data-testid={testId}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
        {description ? (
          <p className="text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>

      <div className="mt-6 h-72 min-w-0 rounded-[24px] bg-neutral-50 p-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            暂无可展示的统计数据
          </div>
        ) : !isChartReady ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            图表加载中...
          </div>
        ) : (
          <ResponsiveContainer height="100%" minWidth={0} width="100%">
            {chartType === "donut" ? (
              <PieChart>
                <Tooltip
                  formatter={renderTooltipValue}
                />
                <Pie
                  cx="50%"
                  cy="50%"
                  data={data}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      fill={chartColors[index % chartColors.length]}
                      key={`${entry.label}-${entry.value}`}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : chartType === "bar-horizontal" ? (
              <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                <XAxis allowDecimals={false} type="number" />
                <YAxis dataKey="label" type="category" width={88} />
                <Tooltip
                  formatter={renderTooltipValue}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} />
              </BarChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={renderTooltipValue}
                />
                <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {data.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {data.map((entry) => (
            <div
              className="inline-flex min-w-[140px] max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-neutral-50 px-4 py-3 text-sm"
              data-testid="chart-summary-item"
              key={`${entry.label}-${entry.value}`}
            >
              <span className="min-w-0 break-words text-neutral-700">{entry.label}</span>
              <span className="whitespace-nowrap font-medium text-neutral-950">
                {renderValue(entry.value)} / {(entry.percentage * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
