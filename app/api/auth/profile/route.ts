import { buildServiceUrl, proxyError, proxyToUpstream } from "@/lib/server/proxy"

export async function GET(req: Request) {
  const url = buildServiceUrl(process.env.AUTH_SERVICE_URL, "/resolve")

  if (!url) {
    return proxyError("AUTH_SERVICE_URL is not set")
  }

  const sessionId = req.headers.get("X-Session-ID")

  if (!sessionId) {
    return proxyError("X-Session-ID is required", 401)
  }

  return proxyToUpstream({
    url,
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ session_id: sessionId }).toString(),
  })
}
