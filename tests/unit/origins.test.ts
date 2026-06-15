import { beforeEach, describe, expect, it, vi } from "vitest";

function seedEnv() {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app";
  process.env.AUTH_SECRET = "secret-value-1234";
  process.env.CONSOLE_ORIGIN = "https://console.example.com";
  process.env.SURVEY_ORIGIN = "https://survey.example.com/";
}

describe("buildSurveyUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    seedEnv();
  });

  it("always uses the public survey origin for QR and sharing", async () => {
    const { buildSurveyUrl } = await import("@/lib/origins");

    expect(buildSurveyUrl("session-abc")).toBe(
      "https://survey.example.com/s/session-abc",
    );
  });
});
