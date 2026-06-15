import * as XLSX from "xlsx";
import type { QuestionnaireInput } from "@/features/questionnaires/schema";

type RawSubmission = {
  submittedAt: Date;
  totalScore: number | null;
  payloadJson: unknown;
};

function getAnswerMap(payloadJson: unknown) {
  if (!payloadJson || typeof payloadJson !== "object") {
    return {};
  }

  const answers =
    "answers" in payloadJson &&
    payloadJson.answers &&
    typeof payloadJson.answers === "object"
      ? payloadJson.answers
      : {};

  return answers as Record<string, unknown>;
}

function formatAnswerValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(" | ");
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildRawExportRows(
  questionnaire: QuestionnaireInput,
  submissions: RawSubmission[],
) {
  const questions = questionnaire.sections.flatMap((section) => section.questions);

  return submissions.map((submission, index) => {
    const row: Record<string, string | number | null> = {
      序号: index + 1,
      提交时间: formatTimestamp(submission.submittedAt),
      总分: submission.totalScore,
    };
    const answers = getAnswerMap(submission.payloadJson);

    for (const question of questions) {
      row[question.title] = formatAnswerValue(answers[question.key]);
    }

    return row;
  });
}

export function buildRawWorkbook(rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "原始明细");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}
