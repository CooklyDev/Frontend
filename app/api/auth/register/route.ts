import { buildServiceUrl, proxyError, proxyToUpstream, readFormBody } from "@/lib/server/proxy"

export async function POST(req: Request) {
  const url = buildServiceUrl(process.env.AUTH_SERVICE_URL, "/api/v1/register")

  if (!url) {
    return proxyError("AUTH_SERVICE_URL is not set")
  }

  const params = await readFormBody(req)

  return proxyToUpstream({
    url,
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })
}
