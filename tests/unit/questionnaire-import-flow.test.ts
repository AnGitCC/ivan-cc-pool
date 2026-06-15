import { describe, expect, it, vi } from "vitest";
import {
  getQuestionnaireImportErrorMessage,
  importQuestionnaireFromWorkbook,
} from "@/features/questionnaires/import-flow";

describe("importQuestionnaireFromWorkbook", () => {
  it("returns the created questionnaire id and normalizes the title from filename", async () => {
    const parseWorkbookFile = vi.fn().mockReturnValue({
      title: "Excel 导入问卷",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [
            {
              key: "department",
              title: "部门",
              type: "single",
              required: true,
              options: ["研发", "产品"],
            },
          ],
        },
        {
          kind: "formal",
          title: "正式题目",
          questions: [
            {
              key: "course-quality",
              title: "课程质量",
              type: "single",
              required: true,
              options: [{ label: "满意", score: 5 }],
            },
          ],
        },
      ],
    });
    const persistQuestionnaire = vi.fn().mockResolvedValue({
      id: "q-imported",
    });

    const result = await importQuestionnaireFromWorkbook({
      ownerId: "u1",
      filename: "培训反馈问卷.xlsx",
      workbook: new Uint8Array([1, 2, 3]),
      parseWorkbookFile,
      persistQuestionnaire,
    });

    expect(parseWorkbookFile).toHaveBeenCalled();
    expect(persistQuestionnaire).toHaveBeenCalledWith("u1", expect.objectContaining({
      title: "培训反馈问卷",
    }));
    expect(result).toEqual({
      questionnaireId: "q-imported",
      redirectUrl: "/questionnaires/q-imported/edit?imported=1",
    });
  });
});

describe("getQuestionnaireImportErrorMessage", () => {
  it("maps parser errors into business-friendly copy", () => {
    expect(
      getQuestionnaireImportErrorMessage(new Error("Excel 模板表头不符合预期。")),
    ).toBe("导入失败，模板格式不正确。请重新下载最新模板后再填写。");

    expect(
      getQuestionnaireImportErrorMessage(new Error("是否必填仅支持填写“是”或“否”。")),
    ).toBe("导入失败，“是否必填”只能填写“是”或“否”。");

    expect(
      getQuestionnaireImportErrorMessage(new Error("选项列表与选项分值数量不一致。")),
    ).toBe("导入失败，选项和分值的数量没有一一对应，请检查后重新上传。");
  });

  it("falls back to a generic message for unexpected errors", () => {
    expect(getQuestionnaireImportErrorMessage(new Error("DATABASE_TIMEOUT"))).toBe(
      "导入失败，请检查模板内容后重新上传。",
    );
    expect(getQuestionnaireImportErrorMessage("unknown")).toBe(
      "导入失败，请检查模板内容后重新上传。",
    );
  });
});
