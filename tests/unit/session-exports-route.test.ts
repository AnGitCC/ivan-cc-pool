import { describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findFirstMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    session: {
      findFirst: findFirstMock,
    },
    exportJob: {
      findMany: findManyMock,
    },
  },
}));

describe("/api/sessions/[sessionId]/exports", () => {
  it("returns 401 when no session", async () => {
    authMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/sessions/[sessionId]/exports/route");
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when session not owned", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/sessions/[sessionId]/exports/route");
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns jobs list", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findFirstMock.mockResolvedValueOnce({ id: "s1" });
    findManyMock.mockResolvedValueOnce([
      {
        id: "j1",
        kind: "RAW_XLSX",
        status: "READY",
        fileUrl: null,
        createdAt: new Date("2026-06-15T00:00:00.000Z"),
        updatedAt: new Date("2026-06-15T00:00:00.000Z"),
      },
    ]);

    const { GET } = await import("@/app/api/sessions/[sessionId]/exports/route");
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ sessionId: "s1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jobs: [
        {
          id: "j1",
          kind: "RAW_XLSX",
          status: "READY",
          fileUrl: null,
          createdAt: "2026-06-15T00:00:00.000Z",
          updatedAt: "2026-06-15T00:00:00.000Z",
        },
      ],
    });
  });
});

