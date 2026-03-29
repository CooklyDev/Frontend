import { buildServiceUrl, proxyError, proxyToUpstream, withSessionHeader } from "@/lib/server/proxy"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; recipeId: string } }
) {
  const url = buildServiceUrl(
    process.env.CONTENT_SERVICE_URL,
    `/collections/${params.id}/recipes/${params.recipeId}`
  )

  if (!url) {
    return proxyError("CONTENT_SERVICE_URL is not set")
  }

  const headers = withSessionHeader(req, { accept: "application/json" })

  return proxyToUpstream({
    url,
    method: "DELETE",
    headers,
  })
}
