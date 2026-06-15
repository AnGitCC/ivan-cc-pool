import * as XLSX from "xlsx";
import type { SessionStatistics } from "@/features/stats/query";

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export function buildSummaryRows(statistics: SessionStatistics) {
  const rows: Array<Record<string, string | number | null>> = [
    {
      模块: "场次概览",
      指标: "场次名称",
      值: statistics.session.name,
    },
    {
      模块: "场次概览",
      指标: "所属问卷",
      值: statistics.session.questionnaireTitle,
    },
    {
      模块: "回收概览",
      指标: "提交份数",
      值: statistics.responseOverview.submissionCount,
    },
    {
      模块: "计分汇总",
      指标: "计分答卷数",
      值: statistics.scoreSummary.submissionCount,
    },
    {
      模块: "计分汇总",
      指标: "总分累计",
      值: statistics.scoreSummary.totalScore,
    },
    {
      模块: "计分汇总",
      指标: "平均总分",
      值: statistics.scoreSummary.averageScore,
    },
  ];

  for (const datum of statistics.scoreSummary.distribution) {
    rows.push({
      模块: "计分汇总",
      指标: `总分分布 / ${datum.label}`,
      值: datum.value,
      占比: formatPercentage(datum.percentage),
    });
  }

  for (const question of statistics.baseInfoQuestions) {
    for (const datum of question.data) {
      rows.push({
        模块: "基础信息字段统计",
        指标: `${question.title} / ${datum.label}`,
        值: datum.value,
        占比: formatPercentage(datum.percentage),
      });
    }
  }

  for (const question of statistics.formalQuestions) {
    for (const datum of question.data) {
      rows.push({
        模块: "正式题目统计",
        指标: `${question.title} / ${datum.label}`,
        值: datum.value,
        占比: formatPercentage(datum.percentage),
        单题均分: question.averageScore,
      });
    }
  }

  for (const question of statistics.textQuestions) {
    rows.push({
      模块: "文本题明细",
      指标: `${question.title} / 文本条数`,
      值: question.answers.length,
    });
  }

  return rows;
}

export function buildSummaryWorkbook(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "统计汇总");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}
