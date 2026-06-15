import { describe, expect, it, vi } from "vitest";
import worker from "@/../cloudflare/survey-proxy/src/index";

describe("survey-proxy worker", () => {
  it("forwards request to upstream while rewriting origin and referer to target origin", async () => {
    const fetchSpy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchSpy);

    await worker.fetch(
      new Request("https://survey-proxy.ansevan.workers.dev/s/demo", {
        method: "POST",
        headers: {
          origin: "https://survey-proxy.ansevan.workers.dev",
          referer: "https://survey-proxy.ansevan.workers.dev/s/demo",
        },
        body: "x=1",
      }),
      { ORIGIN: "https://an-survey-platform.vercel.app" },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const forwardedRequest = fetchSpy.mock.calls[0]?.[0] as Request;

    expect(forwardedRequest.url).toBe("https://an-survey-platform.vercel.app/s/demo");
    expect(forwardedRequest.headers.get("origin")).toBe("https://an-survey-platform.vercel.app");
    expect(forwardedRequest.headers.get("referer")).toBe(
      "https://an-survey-platform.vercel.app/s/demo",
    );
    expect(forwardedRequest.headers.get("x-forwarded-host")).toBe("an-survey-platform.vercel.app");
    expect(forwardedRequest.headers.get("x-forwarded-proto")).toBe("https");
  });
});
