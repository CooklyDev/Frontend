import { buildServiceUrl, proxyError, proxyToUpstream, readBodyText, withSessionHeader } from "@/lib/server/proxy"

export async function GET(req: Request) {
  const url = buildServiceUrl(process.env.CONTENT_SERVICE_URL, "/recipes")

  if (!url) {
    return proxyError("CONTENT_SERVICE_URL is not set")
  }

  const headers = withSessionHeader(req, { accept: "application/json" })

  return proxyToUpstream({
    url,
    method: "GET",
    headers,
  })
}

export async function POST(req: Request) {
  const url = buildServiceUrl(process.env.CONTENT_SERVICE_URL, "/recipes")

  if (!url) {
    return proxyError("CONTENT_SERVICE_URL is not set")
  }

  const body = await readBodyText(req)
  const headers = withSessionHeader(req, {
    accept: "application/json",
    "content-type": req.headers.get("content-type") ?? "application/json",
  })

  return proxyToUpstream({
    url,
    method: "POST",
    headers,
    body,
  })
}

export async function PUT(req: Request) {
  const url = buildServiceUrl(process.env.CONTENT_SERVICE_URL, "/recipes")

  if (!url) {
    return proxyError("CONTENT_SERVICE_URL is not set")
  }

  const body = await readBodyText(req)
  const headers = withSessionHeader(req, {
    accept: "application/json",
    "content-type": req.headers.get("content-type") ?? "application/json",
  })

  return proxyToUpstream({
    url,
    method: "PUT",
    headers,
    body,
  })
}

export async function DELETE(req: Request) {
  const url = buildServiceUrl(process.env.CONTENT_SERVICE_URL, "/recipes")

  if (!url) {
    return proxyError("CONTENT_SERVICE_URL is not set")
  }

  const body = await readBodyText(req)
  const headers = withSessionHeader(req, {
    accept: "application/json",
    "content-type": req.headers.get("content-type") ?? "application/json",
  })

  return proxyToUpstream({
    url,
    method: "DELETE",
    headers,
    body,
  })
}
