import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  sessionFindFirstMock,
  exportJobCreateMock,
  getSessionStatisticsMock,
  getDashboardPreferenceMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  sessionFindFirstMock: vi.fn(),
  exportJobCreateMock: vi.fn(),
  getSessionStatisticsMock: vi.fn(),
  getDashboardPreferenceMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    session: {
      findFirst: sessionFindFirstMock,
    },
    exportJob: {
      create: exportJobCreateMock,
    },
  },
}));

vi.mock("@/features/stats/query", () => ({
  getSessionStatistics: getSessionStatisticsMock,
}));

vi.mock("@/features/stats/preferences", async () => {
  const actual = await vi.importActual<typeof import("@/features/stats/preferences")>(
    "@/features/stats/preferences",
  );

  return {
    ...actual,
    getDashboardPreference: getDashboardPreferenceMock,
  };
});

const questionnaireFixture = {
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
          type: "single",
          title: "课程质量",
          required: true,
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
} as const;

const statisticsFixture = {
  session: {
    id: "s1",
    name: "Training Feedback",
    status: "ACTIVE" as const,
    publicUrl: "https://survey.example.com/s/training-feedback",
    createdAt: new Date("2026-06-14T10:00:00.000Z"),
    closedAt: null,
    questionnaireId: "q1",
    questionnaireTitle: "培训反馈",
  },
  responseOverview: {
    submissionCount: 2,
    lastSubmittedAt: new Date("2026-06-14T10:30:00.000Z"),
  },
  scoreSummary: {
    submissionCount: 2,
    totalScore: 8,
    averageScore: 4,
    distribution: [
      { label: "3", value: 1, percentage: 0.5 },
      { label: "5", value: 1, percentage: 0.5 },
    ],
  },
  baseInfoQuestions: [
    {
      blockId: "question:department",
      questionKey: "department",
      title: "部门",
      questionType: "single" as const,
      answeredCount: 2,
      averageScore: null,
      data: [
        { label: "研发", value: 1, percentage: 0.5 },
        { label: "产品", value: 1, percentage: 0.5 },
      ],
    },
  ],
  formalQuestions: [
    {
      blockId: "question:course-quality",
      questionKey: "course-quality",
      title: "课程质量",
      questionType: "single" as const,
      answeredCount: 2,
      averageScore: 4,
      data: [
        { label: "满意", value: 1, percentage: 0.5 },
        { label: "一般", value: 1, percentage: 0.5 },
      ],
    },
  ],
  textQuestions: [
    {
      questionKey: "comment",
      title: "意见建议",
      answers: ["讲师讲解很清楚"],
    },
  ],
};

describe("session export routes", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    sessionFindFirstMock.mockReset();
    getSessionStatisticsMock.mockReset();
    getDashboardPreferenceMock.mockReset();
  });

  it("returns a raw workbook for one session", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    sessionFindFirstMock.mockResolvedValue({
      id: "s1",
      name: "Training Feedback",
      questionnaire: {
        schemaJson: questionnaireFixture,
      },
      submissions: [
        {
          submittedAt: new Date("2026-06-14T10:20:00.000Z"),
          totalScore: 5,
          payloadJson: {
            answers: {
              department: "研发",
              "course-quality": "满意",
              comment: "讲师讲解很清楚",
            },
          },
        },
      ],
    });

    const { GET } = await import("@/app/api/sessions/[sessionId]/exports/raw/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain(
      'session-training-feedback-raw.xlsx',
    );

    const workbook = XLSX.read(await response.arrayBuffer(), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]],
    );

    expect(rows[0]).toMatchObject({
      序号: 1,
      部门: "研发",
      课程质量: "满意",
      意见建议: "讲师讲解很清楚",
      总分: 5,
    });
  });

  it("returns a summary workbook for one session", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getSessionStatisticsMock.mockResolvedValue(statisticsFixture);

    const { GET } = await import(
      "@/app/api/sessions/[sessionId]/exports/summary/route"
    );
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      'session-training-feedback-summary.xlsx',
    );

    const workbook = XLSX.read(await response.arrayBuffer(), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]],
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          模块: "回收概览",
          指标: "提交份数",
          值: 2,
        }),
        expect.objectContaining({
          模块: "正式题目统计",
          指标: "课程质量 / 满意",
          值: 1,
        }),
      ]),
    );
  });

  it("returns a pdf report that follows current dashboard preferences", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    getSessionStatisticsMock.mockResolvedValue(statisticsFixture);
    getDashboardPreferenceMock.mockResolvedValue({
      hiddenModules: ["text-feedback"],
      chartTypeByBlock: {
        "question:course-quality": "bar-horizontal",
      },
    });

    const { GET } = await import("@/app/api/sessions/[sessionId]/exports/pdf/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      'session-training-feedback-report.pdf',
    );

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.toString("utf8", 0, 8)).toContain("%PDF-1.");
  });

  it("returns a public qr filename for download", async () => {
    const { buildQrDownloadFileName } = await import("@/features/exports/filenames");

    expect(buildQrDownloadFileName("Training Feedback")).toBe(
      "session-training-feedback-qr.png",
    );
  });
});
