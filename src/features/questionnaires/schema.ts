import { z } from "zod";

const plainOptionSchema = z.string().trim().min(1);
const scoredOptionSchema = z.object({
  label: z.string().trim().min(1),
  score: z.number().finite(),
});

const choiceQuestionTypes = z.enum(["single", "multiple"]);
const freeformQuestionTypes = z.enum(["text", "rating"]);

const questionBaseSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().trim().min(1),
  required: z.boolean().default(false),
});

const choiceQuestionSchema = questionBaseSchema.extend({
  type: choiceQuestionTypes,
  options: z.array(z.union([plainOptionSchema, scoredOptionSchema])).min(1),
});

const freeformQuestionSchema = questionBaseSchema.extend({
  type: freeformQuestionTypes,
  options: z.array(z.union([plainOptionSchema, scoredOptionSchema])).optional(),
});

export const questionSchema = z.union([
  choiceQuestionSchema,
  freeformQuestionSchema,
]);

const baseInfoSectionSchema = z.object({
  kind: z.literal("base-info"),
  title: z.string().trim().min(1),
  questions: z.array(questionSchema).min(1),
});

const formalSectionSchema = z.object({
  kind: z.literal("formal"),
  title: z.string().trim().min(1),
  questions: z.array(questionSchema).min(1),
});

export const questionnaireSectionSchema = z.union([
  baseInfoSectionSchema,
  formalSectionSchema,
]);

export const questionnaireSchema = z.object({
  title: z.string().trim().min(1),
  description: z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
      }

      return value;
    },
    z.string().trim().min(1).optional(),
  ),
  sections: z
    .tuple([baseInfoSectionSchema, formalSectionSchema])
    .refine(
      ([baseInfoSection, formalSection]) =>
        baseInfoSection.kind === "base-info" && formalSection.kind === "formal",
      "问卷必须依次包含基础信息和正式题目两个分组。",
    ),
});

export type QuestionnaireQuestion = z.infer<typeof questionSchema>;
export type QuestionnaireSection = z.infer<typeof questionnaireSectionSchema>;
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;

export type QuestionnaireDraft = {
  title: string;
  description: string;
  sections: Array<{
    kind: "base-info" | "formal";
    title: string;
    questions: QuestionnaireQuestion[];
  }>;
};

export function createEmptyQuestionnaireDraft(): QuestionnaireDraft {
  return {
    title: "",
    description: "",
    sections: [
      {
        kind: "base-info",
        title: "基础信息",
        questions: [
          {
            key: "department",
            type: "single",
            title: "部门",
            required: true,
            options: ["研发", "产品", "运营"],
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
            required: true,
            options: [
              { label: "非常满意", score: 5 },
              { label: "满意", score: 4 },
              { label: "一般", score: 3 },
            ],
          },
        ],
      },
    ],
  };
}
