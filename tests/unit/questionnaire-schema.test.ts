import { describe, expect, it } from "vitest";
import {
  createEmptyQuestionnaireDraft,
  questionnaireSchema,
} from "@/features/questionnaires/schema";

describe("questionnaireSchema", () => {
  it("accepts base info blocks and scored formal questions", () => {
    const result = questionnaireSchema.safeParse({
      title: "培训反馈",
      sections: [
        {
          kind: "base-info",
          title: "基础信息",
          questions: [
            {
              key: "department",
              type: "single",
              title: "部门",
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
              type: "single",
              title: "课程质量",
              options: [
                { label: "满意", score: 5 },
                { label: "一般", score: 3 },
              ],
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("creates a starter draft that becomes valid after filling the title", () => {
    const draft = createEmptyQuestionnaireDraft();

    const result = questionnaireSchema.safeParse({
      ...draft,
      title: "默认起始问卷",
    });

    expect(result.success).toBe(true);
  });
});
