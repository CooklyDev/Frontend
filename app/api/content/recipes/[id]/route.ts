import { buildServiceUrl, proxyError, proxyToUpstream, withSessionHeader } from "@/lib/server/proxy"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = buildServiceUrl(process.env.CONTENT_SERVICE_URL, `/recipes/${id}`)

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
