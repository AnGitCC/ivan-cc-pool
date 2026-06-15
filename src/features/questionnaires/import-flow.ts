import { parseQuestionnaireWorkbookFile } from "@/features/questionnaires/import";

const genericImportErrorMessage = "导入失败，请检查模板内容后重新上传。";

function normalizeImportedQuestionnaireTitle(filename: string) {
  const baseName = filename.replace(/\.[^.]+$/, "").trim();
  return baseName || "Excel 导入问卷";
}

export function getQuestionnaireImportErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return genericImportErrorMessage;
  }

  switch (error.message) {
    case "MISSING_IMPORT_FILE":
      return "还没有选择 Excel 文件，请先选择文件后再上传。";
    case "Excel 模板表头不符合预期。":
      return "导入失败，模板格式不正确。请重新下载最新模板后再填写。";
    case "是否必填仅支持填写“是”或“否”。":
      return "导入失败，“是否必填”只能填写“是”或“否”。";
    case "选项列表与选项分值数量不一致。":
      return "导入失败，选项和分值的数量没有一一对应，请检查后重新上传。";
    case "选项分值存在时必须同时填写选项列表。":
      return "导入失败，填写了分值但没有填写对应选项，请补充完整后重新上传。";
    default:
      if (error.message.startsWith("题型“")) {
        return "导入失败，题型填写不正确。请使用模板里的中文题型名称。";
      }

      if (error.message.startsWith("第 ") && error.message.includes("所属分组无效")) {
        return "导入失败，所属分组填写不正确。请只填写“基础信息”或“正式题目”。";
      }

      if (error.message.includes("分值不是有效数字")) {
        return "导入失败，选项分值里包含无效数字，请检查后重新上传。";
      }

      return genericImportErrorMessage;
  }
}

type ImportQuestionnaireFromWorkbookOptions = {
  ownerId: string;
  filename: string;
  workbook: ArrayBuffer | Uint8Array;
  parseWorkbookFile?: typeof parseQuestionnaireWorkbookFile;
  persistQuestionnaire?: (
    ownerId: string,
    rawInput: unknown,
  ) => Promise<{
    id: string;
  }>;
};

export async function importQuestionnaireFromWorkbook({
  ownerId,
  filename,
  workbook,
  parseWorkbookFile = parseQuestionnaireWorkbookFile,
  persistQuestionnaire,
}: ImportQuestionnaireFromWorkbookOptions) {
  const parsed = parseWorkbookFile(workbook);
  const saveQuestionnaire =
    persistQuestionnaire ??
    (await import("@/features/questionnaires/actions")).createQuestionnaire;
  const questionnaire = await saveQuestionnaire(ownerId, {
    ...parsed,
    title: normalizeImportedQuestionnaireTitle(filename),
  });

  return {
    questionnaireId: questionnaire.id,
    redirectUrl: `/questionnaires/${questionnaire.id}/edit?imported=1`,
  };
}
