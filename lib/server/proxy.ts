import { NextResponse } from "next/server"

type ProxyOptions = {
  url: string
  method: string
  headers?: HeadersInit
  body?: BodyInit | null
}

export function buildServiceUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return null
  }

  const trimmedBase = baseUrl.replace(/\/+$/, "")
  const trimmedPath = path.replace(/^\/+/, "")

  return `${trimmedBase}/${trimmedPath}`
}

export function proxyError(message: string, status = 500) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "proxy_error",
        message,
      },
    },
    { status }
  )
}

export function withSessionHeader(req: Request, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders)
  const sessionId = req.headers.get("X-Session-ID")

  if (sessionId) {
    headers.set("X-Session-ID", sessionId)
  }

  return headers
}

export async function readFormBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? ""

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await req.text())
  }

  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}))
    const params = new URLSearchParams()

    Object.entries(json ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return
      }

      params.append(key, String(value))
    })

    return params
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const params = new URLSearchParams()

    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        params.append(key, value)
      }
    }

    return params
  }

  const fallbackText = await req.text()
  return new URLSearchParams(fallbackText)
}

export async function readBodyText(req: Request) {
  const text = await req.text()
  return text.length ? text : null
}

export async function proxyToUpstream({ url, method, headers, body }: ProxyOptions) {
  const response = await fetch(url, { method, headers, body })
  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")

  let payload = ""

  if (isJson) {
    const data = await response.json().catch(() => null)
    payload = JSON.stringify(data)
  } else {
    payload = await response.text()
  }

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "content-type": isJson ? "application/json" : contentType || "text/plain",
    },
  })
}
