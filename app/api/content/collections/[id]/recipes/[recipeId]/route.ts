import { buildServiceUrl, proxyError, proxyToUpstream, withSessionHeader } from "@/lib/server/proxy"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  const { id, recipeId } = await params
  const url = buildServiceUrl(
    process.env.CONTENT_SERVICE_URL,
    `/collections/${id}/recipes/${recipeId}`
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
