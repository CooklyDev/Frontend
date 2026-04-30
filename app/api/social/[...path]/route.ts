import { buildServiceUrl, proxyError, proxyToUpstream, readBodyText, withSessionHeader } from "@/lib/server/proxy"

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function proxySocial(req: Request, method: string, context: RouteContext) {
  const { path } = await context.params
  const requestUrl = new URL(req.url)
  const safePath = path.map((segment) => encodeURIComponent(segment)).join("/")
  const url = buildServiceUrl(
    process.env.SOCIAL_SERVICE_URL,
    `/api/v1/${safePath}${requestUrl.search}`
  )

  if (!url) {
    return proxyError("SOCIAL_SERVICE_URL is not set")
  }

  const hasBody = method !== "GET" && method !== "HEAD"
  const body = hasBody ? await readBodyText(req) : undefined
  const headers = withSessionHeader(req, {
    accept: "application/json",
    ...(hasBody ? { "content-type": req.headers.get("content-type") ?? "application/json" } : {}),
  })

  return proxyToUpstream({
    url,
    method,
    headers,
    body,
  })
}

export async function GET(req: Request, context: RouteContext) {
  return proxySocial(req, "GET", context)
}

export async function POST(req: Request, context: RouteContext) {
  return proxySocial(req, "POST", context)
}

export async function PUT(req: Request, context: RouteContext) {
  return proxySocial(req, "PUT", context)
}

export async function DELETE(req: Request, context: RouteContext) {
  return proxySocial(req, "DELETE", context)
}
