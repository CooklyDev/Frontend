import { buildServiceUrl, proxyError, proxyToUpstream, readBodyText, withSessionHeader } from "@/lib/server/proxy"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const url = buildServiceUrl(
    process.env.CONTENT_SERVICE_URL,
    `/collections/${params.id}/recipes`
  )

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
