import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  cookiesMock,
  createMock,
  findQuestionnaireMock,
  updateMock,
  listSessionsMock,
  deleteSubmissionsMock,
  deleteScoreAggregatesMock,
  deleteOptionAggregatesMock,
  deleteExportJobsMock,
  deleteSessionMock,
  transactionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  cookiesMock: vi.fn(),
  createMock: vi.fn(),
  findQuestionnaireMock: vi.fn(),
  updateMock: vi.fn(),
  listSessionsMock: vi.fn(),
  deleteSubmissionsMock: vi.fn(),
  deleteScoreAggregatesMock: vi.fn(),
  deleteOptionAggregatesMock: vi.fn(),
  deleteExportJobsMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    session: {
      create: createMock,
      update: updateMock,
      findMany: listSessionsMock,
      deleteMany: deleteSessionMock,
    },
    questionnaire: {
      findFirst: findQuestionnaireMock,
    },
    submission: {
      deleteMany: deleteSubmissionsMock,
    },
    scoreAggregate: {
      deleteMany: deleteScoreAggregatesMock,
    },
    optionAggregate: {
      deleteMany: deleteOptionAggregatesMock,
    },
    exportJob: {
      deleteMany: deleteExportJobsMock,
    },
    $transaction: transactionMock,
  },
}));

function seedEnv() {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app";
  process.env.AUTH_SECRET = "secret-value-1234";
  process.env.CONSOLE_ORIGIN = "https://console.example.com";
  process.env.SURVEY_ORIGIN = "https://survey.example.com";
}

describe("session actions", () => {
  beforeEach(() => {
    vi.resetModules();
    seedEnv();
    authMock.mockReset();
    cookiesMock.mockReset();
    createMock.mockReset();
    findQuestionnaireMock.mockReset();
    updateMock.mockReset();
    listSessionsMock.mockReset();
    deleteSubmissionsMock.mockReset();
    deleteScoreAggregatesMock.mockReset();
    deleteOptionAggregatesMock.mockReset();
    deleteExportJobsMock.mockReset();
    deleteSessionMock.mockReset();
    transactionMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
  });

  it("creates a session with a public survey url", async () => {
    createMock.mockResolvedValue({
      id: "s1",
      name: "培训第一场",
      slug: "session-slug",
      publicUrl: "https://survey.example.com/s/session-slug",
    });

    const { createSession } = await import("@/features/sessions/actions");

    const session = await createSession("q1", "u1", "培训第一场");

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0]?.[0]).toMatchObject({
      data: {
        questionnaireId: "q1",
        ownerId: "u1",
        name: "培训第一场",
      },
    });
    expect(createMock.mock.calls[0]?.[0].data.slug).toMatch(
      /^[a-z0-9]{10}$/,
    );
    expect(createMock.mock.calls[0]?.[0].data.publicUrl).toMatch(
      /^https:\/\/survey\.example\.com\/s\/[a-z0-9]{10}$/,
    );
    expect(session.id).toBe("s1");
  });

  it("closes a session for the current owner", async () => {
    updateMock.mockResolvedValue({
      id: "s1",
      status: "CLOSED",
    });

    const { closeSession } = await import("@/features/sessions/actions");

    await closeSession("s1", "u1");

    expect(updateMock).toHaveBeenCalledWith({
      where: {
        id: "s1",
        ownerId: "u1",
      },
      data: {
        status: "CLOSED",
        closedAt: expect.any(Date),
      },
    });
  });

  it("lists sessions with newest first", async () => {
    listSessionsMock.mockResolvedValue([{ id: "new" }, { id: "old" }]);

    const { listQuestionnaireSessions } = await import("@/features/sessions/actions");

    await listQuestionnaireSessions("q1", "u1");

    expect(listSessionsMock).toHaveBeenCalledWith({
      where: {
        questionnaireId: "q1",
        ownerId: "u1",
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: expect.any(Object),
    });
  });

  it("deletes a session and all dependent data in one transaction", async () => {
    deleteSubmissionsMock.mockResolvedValue({ count: 8 });
    deleteScoreAggregatesMock.mockResolvedValue({ count: 3 });
    deleteOptionAggregatesMock.mockResolvedValue({ count: 5 });
    deleteExportJobsMock.mockResolvedValue({ count: 2 });
    deleteSessionMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        submission: { deleteMany: deleteSubmissionsMock },
        scoreAggregate: { deleteMany: deleteScoreAggregatesMock },
        optionAggregate: { deleteMany: deleteOptionAggregatesMock },
        exportJob: { deleteMany: deleteExportJobsMock },
        session: { deleteMany: deleteSessionMock },
      }),
    );

    const { deleteOwnedSession } = await import("@/features/sessions/actions");

    await expect(deleteOwnedSession("s1", "u1")).resolves.toEqual({
      deleted: true,
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteSubmissionsMock).toHaveBeenCalledWith({
      where: {
        sessionId: "s1",
      },
    });
    expect(deleteScoreAggregatesMock).toHaveBeenCalledWith({
      where: {
        sessionId: "s1",
      },
    });
    expect(deleteOptionAggregatesMock).toHaveBeenCalledWith({
      where: {
        sessionId: "s1",
      },
    });
    expect(deleteExportJobsMock).toHaveBeenCalledWith({
      where: {
        sessionId: "s1",
      },
    });
    expect(deleteSessionMock).toHaveBeenCalledWith({
      where: {
        id: "s1",
        ownerId: "u1",
      },
    });
  });

  it("rejects deleting a missing owned session", async () => {
    deleteSessionMock.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        submission: { deleteMany: deleteSubmissionsMock },
        scoreAggregate: { deleteMany: deleteScoreAggregatesMock },
        optionAggregate: { deleteMany: deleteOptionAggregatesMock },
        exportJob: { deleteMany: deleteExportJobsMock },
        session: { deleteMany: deleteSessionMock },
      }),
    );

    const { deleteOwnedSession } = await import("@/features/sessions/actions");

    await expect(deleteOwnedSession("missing", "u1")).rejects.toThrow(
      "SESSION_NOT_FOUND",
    );
  });

  it("renders a delete error banner from search params", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u1",
      },
    });
    findQuestionnaireMock.mockResolvedValue({
      id: "q1",
      title: "培训反馈问卷",
      description: "用于课程培训后的匿名反馈。",
      schemaJson: {},
      createdAt: new Date("2026-06-15T00:00:00.000Z"),
      updatedAt: new Date("2026-06-15T00:00:00.000Z"),
    });
    listSessionsMock.mockResolvedValue([]);
    const { default: QuestionnaireSessionsPage } = await import(
      "@/app/(console)/questionnaires/[questionnaireId]/sessions/page"
    );

    const html = renderToStaticMarkup(
      await QuestionnaireSessionsPage({
        params: Promise.resolve({
          questionnaireId: "q1",
        }),
        searchParams: Promise.resolve({
          deleteError: encodeURIComponent("该场次不存在或已被删除，请刷新页面后重试。"),
        }),
      } as never),
    );

    expect(html).toContain("删除未完成：该场次不存在或已被删除，请刷新页面后重试。");
  });
});
