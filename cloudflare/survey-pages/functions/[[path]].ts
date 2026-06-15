export const onRequest: PagesFunction<{ ORIGIN: string }> = async (context) => {
  const { request, env } = context
  const upstreamOrigin = new URL(env.ORIGIN)
  const incomingUrl = new URL(request.url)
  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin)

  const headers = new Headers(request.headers)
  headers.set("x-forwarded-host", upstreamOrigin.host)
  headers.set("host", upstreamOrigin.host)
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

  const upstreamResponse = await fetch(new Request(upstreamUrl.toString(), init))
  const contentType = upstreamResponse.headers.get("content-type") || ""
  if (contentType.includes("text/html")) {
    let text = await upstreamResponse.text()
    const workerOrigin = new URL(request.url).origin
    const upstreamOriginStr = upstreamOrigin.origin
    text = text.replaceAll(upstreamOriginStr, workerOrigin)
    return new Response(text, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    })
  }
  return upstreamResponse
}