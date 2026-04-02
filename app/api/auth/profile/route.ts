import {
  buildServiceUrl,
  proxyError,
  proxyToUpstream,
} from "@/lib/server/proxy"

export async function GET(req: Request) {
  const url = buildServiceUrl(process.env.AUTH_SERVICE_URL, "/api/v1/profile")

  if (!url) {
    return proxyError("AUTH_SERVICE_URL is not set")
  }

  const sessionId = req.headers.get("X-Session-ID") ?? ""

  return proxyToUpstream({
    url,
    method: "GET",
    headers: {
      accept: "application/json",
      "X-Session-ID": sessionId,
    },
  })
}
