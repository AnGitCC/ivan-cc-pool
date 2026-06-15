import { describe, expect, it } from "vitest";

describe("envSchema", () => {
  it("accepts separate console and survey origins", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app";
    process.env.AUTH_SECRET = "secret-value-1234";
    process.env.CONSOLE_ORIGIN = "https://console.example.com";
    process.env.SURVEY_ORIGIN = "https://survey.example.com";

    const { envSchema } = await import("../../src/lib/env");
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app",
      AUTH_SECRET: "secret-value-1234",
      CONSOLE_ORIGIN: "https://console.example.com",
      SURVEY_ORIGIN: "https://survey.example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects identical console and survey origins", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app";
    process.env.AUTH_SECRET = "secret-value-1234";
    process.env.CONSOLE_ORIGIN = "https://console.example.com";
    process.env.SURVEY_ORIGIN = "https://survey.example.com";

    const { envSchema } = await import("../../src/lib/env");
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app",
      AUTH_SECRET: "secret-value-1234",
      CONSOLE_ORIGIN: "https://app.example.com",
      SURVEY_ORIGIN: "https://app.example.com",
    });

    expect(result.success).toBe(false);
  });
});
