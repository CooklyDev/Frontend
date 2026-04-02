"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ email, password }).toString(),
      })

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; data?: string; error?: { message?: string } }
        | null

      if (!response.ok || !payload?.success || !payload.data) {
        setErrorMessage(payload?.error?.message ?? "Не удалось войти")
        return
      }

      localStorage.setItem("session_id", payload.data)
      window.location.href = "/my-recipes"
    } catch {
      setErrorMessage("Не удалось войти")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold">Вход</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Войдите, чтобы сохранить рецепты и коллекции.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
        />

        <label className="block text-sm font-medium" htmlFor="login-password">
          Пароль
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
        />

        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>
    </section>
  )
}
