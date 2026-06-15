import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitSurveyResponse } from "@/features/submissions/actions";

const {
  findUniqueMock,
  createMock,
  scoreAggregateFindFirstMock,
  scoreAggregateCreateMock,
  scoreAggregateUpdateMock,
  optionAggregateFindFirstMock,
  optionAggregateCreateMock,
  optionAggregateUpdateMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
  scoreAggregateFindFirstMock: vi.fn(),
  scoreAggregateCreateMock: vi.fn(),
  scoreAggregateUpdateMock: vi.fn(),
  optionAggregateFindFirstMock: vi.fn(),
  optionAggregateCreateMock: vi.fn(),
  optionAggregateUpdateMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    session: {
      findUnique: findUniqueMock,
    },
    submission: {
      create: createMock,
    },
    scoreAggregate: {
      findFirst: scoreAggregateFindFirstMock,
      create: scoreAggregateCreateMock,
      update: scoreAggregateUpdateMock,
    },
    optionAggregate: {
      findFirst: optionAggregateFindFirstMock,
      create: optionAggregateCreateMock,
      update: optionAggregateUpdateMock,
    },
  },
}));

describe("submitSurveyResponse", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    createMock.mockReset();
    scoreAggregateFindFirstMock.mockReset();
    scoreAggregateCreateMock.mockReset();
    scoreAggregateUpdateMock.mockReset();
    optionAggregateFindFirstMock.mockReset();
    optionAggregateCreateMock.mockReset();
    optionAggregateUpdateMock.mockReset();
  });

  it("rejects submissions for closed sessions", async () => {
    findUniqueMock.mockResolvedValue({
      id: "s1",
      status: "CLOSED",
    });

    await expect(
      submitSurveyResponse("session-1", { answers: {} }),
    ).rejects.toThrow("SESSION_CLOSED");
  });

  it("persists anonymous answers for active sessions", async () => {
    findUniqueMock.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      questionnaire: {
        schemaJson: {
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
                {
                  key: "comment",
                  type: "text",
                  title: "意见建议",
                  required: false,
                },
              ],
            },
          ],
        },
      },
    });
    createMock.mockResolvedValue({
      id: "sub1",
      sessionId: "s1",
      totalScore: 5,
    });
    scoreAggregateFindFirstMock.mockResolvedValue(null);
    scoreAggregateCreateMock.mockResolvedValue({
      id: "score-1",
      questionKey: "course-quality",
    });
    optionAggregateFindFirstMock.mockResolvedValue(null);
    optionAggregateCreateMock.mockResolvedValue({
      id: "option-1",
      questionKey: "course-quality",
    });

    const submission = await submitSurveyResponse("s1", {
      answers: {
        department: "研发",
        "course-quality": "满意",
        comment: "很有帮助",
      },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        sessionId: "s1",
        payloadJson: {
          answers: {
            department: "研发",
            "course-quality": "满意",
            comment: "很有帮助",
          },
        },
        totalScore: 5,
      },
    });
    expect(scoreAggregateCreateMock).toHaveBeenCalledWith({
      data: {
        sessionId: "s1",
        questionKey: "course-quality",
        totalScore: 5,
        submissionCount: 1,
        averageScore: 5,
      },
    });
    expect(submission.id).toBe("sub1");
  });
});
