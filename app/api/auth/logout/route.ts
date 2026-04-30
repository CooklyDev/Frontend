import { buildServiceUrl, proxyError, proxyToUpstream, withSessionHeader } from "@/lib/server/proxy"

export async function POST(req: Request) {
  const url = buildServiceUrl(process.env.AUTH_SERVICE_URL, "/api/v1/logout")

  if (!url) {
    return proxyError("AUTH_SERVICE_URL is not set")
  }

  const headers = withSessionHeader(req, { accept: "application/json" })

  return proxyToUpstream({
    url,
    method: "POST",
    headers,
  })
}
