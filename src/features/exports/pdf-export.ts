import {
  getChartTypeForBlock,
  type DashboardPreference,
} from "@/features/stats/preferences";
import type { SessionStatistics } from "@/features/stats/query";

function toAscii(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");

  return normalized || "?";
}

function escapePdfText(value: string) {
  return toAscii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatScore(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return Number(value.toFixed(2)).toString();
}

function pushQuestionLines(
  lines: string[],
  prefix: string,
  blockId: string,
  title: string,
  items: Array<{ label: string; value: number; percentage: number }>,
  chartType: string,
  averageScore?: number | null,
) {
  lines.push(`${prefix}: ${title}`);
  lines.push(`Chart Type: ${chartType}`);

  if (averageScore !== undefined) {
    lines.push(`Average Score: ${formatScore(averageScore ?? null)}`);
  }

  for (const item of items) {
    lines.push(
      `${blockId} / ${item.label}: ${item.value} (${formatPercentage(item.percentage)})`,
    );
  }
}

export function buildPdfReportLines(
  statistics: SessionStatistics,
  preference: DashboardPreference,
) {
  const hiddenModules = new Set(preference.hiddenModules);
  const lines = [
    "Survey Session Report",
    `Session Name: ${statistics.session.name}`,
    `Questionnaire: ${statistics.session.questionnaireTitle}`,
    `Public URL: ${statistics.session.publicUrl}`,
    `Session Status: ${statistics.session.status}`,
  ];

  if (!hiddenModules.has("response-overview")) {
    lines.push("Response Overview");
    lines.push(`Submission Count: ${statistics.responseOverview.submissionCount}`);
  }

  if (!hiddenModules.has("score-summary")) {
    lines.push("Score Summary");
    lines.push(`Scored Submission Count: ${statistics.scoreSummary.submissionCount}`);
    lines.push(`Total Score: ${formatScore(statistics.scoreSummary.totalScore)}`);
    lines.push(`Average Score: ${formatScore(statistics.scoreSummary.averageScore)}`);
    lines.push(
      `Chart Type: ${getChartTypeForBlock(preference, "score-distribution", "bar-vertical")}`,
    );

    for (const item of statistics.scoreSummary.distribution) {
      lines.push(
        `Score ${item.label}: ${item.value} (${formatPercentage(item.percentage)})`,
      );
    }
  }

  if (!hiddenModules.has("base-info")) {
    for (const question of statistics.baseInfoQuestions) {
      pushQuestionLines(
        lines,
        "Base Info",
        question.blockId,
        question.title,
        question.data,
        getChartTypeForBlock(preference, question.blockId, "bar-horizontal"),
      );
    }
  }

  if (!hiddenModules.has("formal-questions")) {
    for (const question of statistics.formalQuestions) {
      pushQuestionLines(
        lines,
        "Formal Question",
        question.blockId,
        question.title,
        question.data,
        getChartTypeForBlock(preference, question.blockId, "donut"),
        question.averageScore,
      );
    }
  }

  if (!hiddenModules.has("text-feedback")) {
    for (const question of statistics.textQuestions) {
      lines.push(`Text Feedback: ${question.title}`);

      for (const answer of question.answers) {
        lines.push(`- ${answer}`);
      }
    }
  }

  return lines;
}

export function buildPdfDocument(lines: string[]) {
  const safeLines = lines.slice(0, 45).map((line) => escapePdfText(line));
  const contentStream = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "50 760 Td",
    ...safeLines.flatMap((line, index) =>
      index === 0 ? [`(${line}) Tj`] : ["T*", `(${line}) Tj`],
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export function buildPdfReport(
  statistics: SessionStatistics,
  preference: DashboardPreference,
) {
  return buildPdfDocument(buildPdfReportLines(statistics, preference));
}
