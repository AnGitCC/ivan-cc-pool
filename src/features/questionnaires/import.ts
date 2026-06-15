import * as XLSX from "xlsx";
import {
  questionnaireSchema,
  type QuestionnaireInput,
  type QuestionnaireQuestion,
} from "@/features/questionnaires/schema";
import {
  optionSeparator,
  questionnaireTypeLabels,
  requiredFlagLabels,
  templateHeader,
} from "@/features/questionnaires/template";

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => normalizeCell(cell).length === 0);
}

function createQuestionKey(title: string, index: number) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `question-${index + 1}`;
}

function parseRequiredFlag(value: string) {
  if (value === requiredFlagLabels.required) {
    return true;
  }

  if (value === requiredFlagLabels.optional || value.length === 0) {
    return false;
  }

  throw new Error("是否必填仅支持填写“是”或“否”。");
}

function parseQuestionType(value: string): QuestionnaireQuestion["type"] {
  const normalizedTypeMap = new Map<string, QuestionnaireQuestion["type"]>([
    [questionnaireTypeLabels.single, "single"],
    [questionnaireTypeLabels.multiple, "multiple"],
    [questionnaireTypeLabels.text, "text"],
    [questionnaireTypeLabels.rating, "rating"],
  ]);

  const questionType = normalizedTypeMap.get(value);

  if (!questionType) {
    throw new Error(
      `题型“${value}”无效，仅支持“${Object.values(questionnaireTypeLabels).join("、")}”。`,
    );
  }

  return questionType;
}

function splitDelimitedValues(value: string) {
  return value
    .split(optionSeparator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isChoiceQuestionType(
  type: QuestionnaireQuestion["type"],
): type is Extract<QuestionnaireQuestion, { type: "single" | "multiple" }>["type"] {
  return type === "single" || type === "multiple";
}

function parseOptions(
  optionCell: string,
  scoreCell: string,
): QuestionnaireQuestion["options"] | undefined {
  const labels = splitDelimitedValues(optionCell);
  const scores = splitDelimitedValues(scoreCell);

  if (labels.length === 0) {
    if (scores.length > 0) {
      throw new Error("选项分值存在时必须同时填写选项列表。");
    }

    return undefined;
  }

  if (scores.length === 0) {
    return labels;
  }

  if (labels.length !== scores.length) {
    throw new Error("选项列表与选项分值数量不一致。");
  }

  return labels.map((label, index) => {
    const score = Number(scores[index]);

    if (!Number.isFinite(score)) {
      throw new Error(`选项“${label}”的分值不是有效数字。`);
    }

    return {
      label,
      score,
    };
  });
}

function validateHeaderRow(row: unknown[]) {
  const normalizedHeader = row.map((cell) => normalizeCell(cell));

  if (
    normalizedHeader.length < templateHeader.length ||
    templateHeader.some((header, index) => normalizedHeader[index] !== header)
  ) {
    throw new Error("Excel 模板表头不符合预期。");
  }
}

export function parseQuestionnaireWorkbook(rows: unknown[][]) {
  if (rows.length === 0) {
    throw new Error("Excel 内容为空，无法导入。");
  }

  validateHeaderRow(rows[0]);

  const sections = {
    基础信息: {
      kind: "base-info" as const,
      title: "基础信息",
      questions: [] as QuestionnaireInput["sections"][0]["questions"],
    },
    正式题目: {
      kind: "formal" as const,
      title: "正式题目",
      questions: [] as QuestionnaireInput["sections"][1]["questions"],
    },
  };

  rows.slice(1).forEach((row, rowIndex) => {
    if (isBlankRow(row)) {
      return;
    }

    const [rawGroup, rawTitle, rawType, rawRequired, rawOptions, rawScores] = row;
    const group = normalizeCell(rawGroup);
    const title = normalizeCell(rawTitle);
    const type = parseQuestionType(normalizeCell(rawType));

    if (!(group in sections)) {
      throw new Error(`第 ${rowIndex + 2} 行的所属分组无效。`);
    }

    const section = sections[group as keyof typeof sections];
    const questionBase = {
      key: createQuestionKey(title, section.questions.length),
      title,
      required: parseRequiredFlag(normalizeCell(rawRequired)),
    };
    const options = parseOptions(normalizeCell(rawOptions), normalizeCell(rawScores));

    if (isChoiceQuestionType(type)) {
      section.questions.push({
        ...questionBase,
        type,
        options: options ?? [],
      });
      return;
    }

    section.questions.push({
      ...questionBase,
      type,
      options,
    });
  });

  return questionnaireSchema.parse({
    title: "Excel 导入问卷",
    sections: [sections.基础信息, sections.正式题目],
  });
}

export function parseQuestionnaireWorkbookFile(source: ArrayBuffer | Uint8Array) {
  const data = source instanceof Uint8Array ? source : new Uint8Array(source);
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel 文件中未找到工作表。");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return parseQuestionnaireWorkbook(rows);
}
