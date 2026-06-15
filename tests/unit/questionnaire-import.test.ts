import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseQuestionnaireWorkbook } from "@/features/questionnaires/import";
import { buildQuestionnaireTemplateWorkbook } from "@/features/questionnaires/template";

describe("parseQuestionnaireWorkbook", () => {
  it("maps Chinese Excel rows into the shared questionnaire schema", () => {
    const rows = [
      ["所属分组", "题目标题", "题型", "是否必填", "选项列表", "选项分值"],
      ["基础信息", "部门", "单选题", "是", "研发，产品", ""],
      ["正式题目", "课程质量", "单选题", "是", "满意，一般", "5，3"],
      ["正式题目", "课程收获", "多选题", "否", "实用，清晰，有启发", "3，2，1"],
      ["正式题目", "培训建议", "文本题", "否", "", ""],
      ["正式题目", "综合评分", "评分题", "是", "", ""],
    ];

    const result = parseQuestionnaireWorkbook(rows);

    expect(result).toMatchObject({
      title: "Excel 导入问卷",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [
            {
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
              title: "课程质量",
              type: "single",
              required: true,
              options: [
                { label: "满意", score: 5 },
                { label: "一般", score: 3 },
              ],
            },
            {
              title: "课程收获",
              type: "multiple",
              required: false,
              options: [
                { label: "实用", score: 3 },
                { label: "清晰", score: 2 },
                { label: "有启发", score: 1 },
              ],
            },
            {
              title: "培训建议",
              type: "text",
              required: false,
            },
            {
              title: "综合评分",
              type: "rating",
              required: true,
            },
          ],
        },
      ],
    });
  });
});

describe("buildQuestionnaireTemplateWorkbook", () => {
  it("creates a downloadable workbook with Chinese header and example rows for every supported question type", () => {
    const workbookBuffer = buildQuestionnaireTemplateWorkbook();
    const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      raw: false,
    });

    expect(workbook.SheetNames[0]).toBe("问卷模板");
    expect(rows.slice(0, 6)).toEqual([
      ["所属分组", "题目标题", "题型", "是否必填", "选项列表", "选项分值"],
      ["基础信息", "部门", "单选题", "是", "研发，产品，运营", ""],
      ["正式题目", "课程质量", "单选题", "是", "非常满意，满意，一般", "5，4，3"],
      ["正式题目", "课程收获", "多选题", "否", "实用，清晰，有启发", "3，2，1"],
      ["正式题目", "培训建议", "文本题", "否", "", ""],
      ["正式题目", "综合评分", "评分题", "是", "", ""],
    ]);
  });
});
