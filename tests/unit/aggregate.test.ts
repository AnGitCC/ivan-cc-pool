import { describe, expect, it } from "vitest";
import { summarizeAnswers } from "@/features/stats/aggregate";
import { normalizeDashboardPreference } from "@/features/stats/preferences";

describe("summarizeAnswers", () => {
  it("produces score and frequency updates from one submission", () => {
    const result = summarizeAnswers(
      {
        "course-quality": [
          { label: "满意", score: 5 },
          { label: "一般", score: 3 },
        ],
        department: ["研发", "产品"],
      },
      {
        "course-quality": "满意",
        department: "研发",
      },
    );

    expect(result.optionCounts["department:研发"]).toBe(1);
    expect(result.totalScore).toBe(5);
  });

  it("counts multiple answers and numeric ratings", () => {
    const result = summarizeAnswers(
      {
        tags: ["讲师", "内容", "节奏"],
        satisfaction: [
          { label: "1", score: 1 },
          { label: "2", score: 2 },
          { label: "3", score: 3 },
          { label: "4", score: 4 },
          { label: "5", score: 5 },
        ],
      },
      {
        tags: ["讲师", "内容"],
        satisfaction: 4,
      },
    );

    expect(result.optionCounts["tags:讲师"]).toBe(1);
    expect(result.optionCounts["tags:内容"]).toBe(1);
    expect(result.optionCounts["satisfaction:4"]).toBe(1);
    expect(result.totalScore).toBe(4);
  });
});

describe("normalizeDashboardPreference", () => {
  it("keeps valid module keys and chart types only", () => {
    const preference = normalizeDashboardPreference({
      hiddenModules: ["response-overview", "not-exists"],
      chartTypeByBlock: {
        "question:department": "bar-horizontal",
        "question:score": "unknown",
      },
    });

    expect(preference.hiddenModules).toEqual(["response-overview"]);
    expect(preference.chartTypeByBlock).toEqual({
      "question:department": "bar-horizontal",
    });
  });
});
