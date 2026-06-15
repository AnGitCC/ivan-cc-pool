export default {
  async fetch(request: Request, env: { ORIGIN: string }): Promise<Response> {
    const upstreamOrigin = new URL(env.ORIGIN)
    const incomingUrl = new URL(request.url)
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin)

    const headers = new Headers(request.headers)
    headers.set("x-forwarded-host", upstreamOrigin.host)
    headers.set("x-forwarded-proto", "https")

    if (headers.has("origin")) {
      headers.set("origin", upstreamOrigin.origin)
    }

    if (headers.has("referer")) {
      headers.set(
        "referer",
        new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin).toString(),
      )
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer()
    }

    return fetch(new Request(upstreamUrl.toString(), init))
  },
}
