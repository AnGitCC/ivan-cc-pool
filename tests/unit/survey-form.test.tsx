"use client";

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurveyForm } from "@/components/public/survey-form";
import type { QuestionnaireInput } from "@/features/questionnaires/schema";

afterEach(() => {
  cleanup();
});

describe("SurveyForm", () => {
  it("renders choice questions with grid layout", () => {
    const questionnaire: QuestionnaireInput = {
      title: "测试问卷",
      description: undefined,
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
              key: "feedback",
              type: "text",
              title: "你的建议",
              required: false,
            },
          ],
        },
      ],
    };

    render(
      <SurveyForm
        hasError={false}
        questionnaire={questionnaire}
        sessionName="测试场次"
        slug="demo"
        submitAction={vi.fn()}
        submitted={false}
      />,
    );

    const optionGroup = screen.getByTestId("survey-choice-options");
    expect(optionGroup.className).toContain("grid");
    expect(optionGroup.className).toContain(
      "[grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]",
    );
  });
});

