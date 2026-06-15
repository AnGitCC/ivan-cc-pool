import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessionWorkbenchE2eStatistics,
  sessionWorkbenchE2eClosedSessionId,
  sessionWorkbenchE2eSessionId,
  sessionWorkbenchE2eStatistics,
} from "@/components/sessions/session-workbench-page";
import {
  buildSessionWorkbenchHref,
  resolveWorkbenchSessionId,
} from "@/features/sessions/workbench";

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    session: {
      findMany: findManyMock,
    },
  },
}));

function seedEnv() {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app";
  process.env.AUTH_SECRET = "secret-value-1234";
  process.env.CONSOLE_ORIGIN = "https://console.example.com";
  process.env.SURVEY_ORIGIN = "https://survey.example.com";
}

describe("resolveWorkbenchSessionId", () => {
  it("prefers the explicit session id over the dashboard default", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: "session-b",
        fallbackSessionId: "session-a",
      }),
    ).toBe("session-b");
  });

  it("falls back to the dashboard-selected session when no explicit id exists", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: undefined,
        fallbackSessionId: "session-a",
      }),
    ).toBe("session-a");
  });

  it("returns null when neither route provides a session", () => {
    expect(
      resolveWorkbenchSessionId({
        requestedSessionId: undefined,
        fallbackSessionId: null,
      }),
    ).toBeNull();
  });
});

describe("buildSessionWorkbenchHref", () => {
  it("routes workbench navigation to the session deep link", () => {
    expect(buildSessionWorkbenchHref("session-a")).toBe("/sessions/session-a");
  });

  it("always targets the deep-link route when switching sessions", () => {
    expect(buildSessionWorkbenchHref("cmqe189e00001gzxspgo6q2ut")).toBe(
      "/sessions/cmqe189e00001gzxspgo6q2ut",
    );
  });
});

describe("getSessionWorkbenchE2eStatistics", () => {
  it("returns seeded statistics for the primary e2e session", () => {
    expect(getSessionWorkbenchE2eStatistics(sessionWorkbenchE2eSessionId)).toEqual(
      sessionWorkbenchE2eStatistics,
    );
  });

  it("returns the matching closed-session statistics by session id", () => {
    expect(
      getSessionWorkbenchE2eStatistics(sessionWorkbenchE2eClosedSessionId)?.session.id,
    ).toBe(sessionWorkbenchE2eClosedSessionId);
  });

  it("returns null for unknown session ids", () => {
    expect(getSessionWorkbenchE2eStatistics("missing-session")).toBeNull();
  });
});

describe("listOwnedSessionsForWorkbench", () => {
  beforeEach(() => {
    vi.resetModules();
    seedEnv();
    findManyMock.mockReset();
  });

  it("queries only the current questionnaire sessions for the workbench switcher", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "session-a",
        name: "培训第一场",
        status: "ACTIVE",
        createdAt: new Date("2026-06-15T00:00:00.000Z"),
        questionnaireId: "questionnaire-a",
      },
    ]);

    const { listOwnedSessionsForWorkbench } = await import(
      "@/features/sessions/actions"
    );

    const result = await (
      listOwnedSessionsForWorkbench as (
        ownerId: string,
        questionnaireId: string,
      ) => Promise<
        Array<{
          id: string;
          name: string;
          status: "ACTIVE" | "CLOSED";
          createdAt: Date;
          questionnaireId: string;
        }>
      >
    )("user-1", "questionnaire-a");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { ownerId: "user-1", questionnaireId: "questionnaire-a" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        questionnaireId: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    expect(result).toEqual([
      {
        id: "session-a",
        name: "培训第一场",
        status: "ACTIVE",
        createdAt: new Date("2026-06-15T00:00:00.000Z"),
        questionnaireId: "questionnaire-a",
      },
    ]);
  });
});
