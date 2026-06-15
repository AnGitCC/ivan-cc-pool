import * as XLSX from "xlsx";

export const questionnaireTypeLabels = {
  single: "单选题",
  multiple: "多选题",
  text: "文本题",
  rating: "评分题",
} as const;

export const requiredFlagLabels = {
  required: "是",
  optional: "否",
} as const;

export const optionSeparator = "，";

export const templateHeader = [
  "所属分组",
  "题目标题",
  "题型",
  "是否必填",
  "选项列表",
  "选项分值",
];

export const templateExampleRows = [
  [
    "基础信息",
    "部门",
    questionnaireTypeLabels.single,
    requiredFlagLabels.required,
    `研发${optionSeparator}产品${optionSeparator}运营`,
    "",
  ],
  [
    "正式题目",
    "课程质量",
    questionnaireTypeLabels.single,
    requiredFlagLabels.required,
    `非常满意${optionSeparator}满意${optionSeparator}一般`,
    `5${optionSeparator}4${optionSeparator}3`,
  ],
  [
    "正式题目",
    "课程收获",
    questionnaireTypeLabels.multiple,
    requiredFlagLabels.optional,
    `实用${optionSeparator}清晰${optionSeparator}有启发`,
    `3${optionSeparator}2${optionSeparator}1`,
  ],
  [
    "正式题目",
    "培训建议",
    questionnaireTypeLabels.text,
    requiredFlagLabels.optional,
    "",
    "",
  ],
  [
    "正式题目",
    "综合评分",
    questionnaireTypeLabels.rating,
    requiredFlagLabels.required,
    "",
    "",
  ],
];

export function buildQuestionnaireTemplateWorkbook() {
  const sheet = XLSX.utils.aoa_to_sheet([templateHeader, ...templateExampleRows]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "问卷模板");

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
}
