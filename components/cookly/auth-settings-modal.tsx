"use client"

import { clearSessionId, login, logout, register, resolveProfile } from "@/lib/cookly/api"
import type { AuthProfile, ViewMode } from "@/lib/cookly/types"
import { cn } from "@/lib/utils"
import { LogIn, LogOut, Settings, UserPlus, X } from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"

type AuthSettingsMode = "settings" | "login" | "register"

type AuthSettingsModalProps = {
  open: boolean
  initialMode?: AuthSettingsMode
  onClose: () => void
  onAuthChange?: (profile: AuthProfile | null) => void
}

const viewModeKey = "cookly_view_mode"

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "cards"
  }

  return localStorage.getItem(viewModeKey) === "list" ? "list" : "cards"
}

export function AuthSettingsModal({
  open,
  initialMode = "settings",
  onClose,
  onAuthChange,
}: AuthSettingsModalProps) {
  const [mode, setMode] = useState<AuthSettingsMode>(initialMode)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const title = useMemo(() => {
    if (mode === "login") {
      return "Вход"
    }

    if (mode === "register") {
      return "Регистрация"
    }

    return "Настройки"
  }, [mode])

  useEffect(() => {
    if (!open) {
      return
    }

    setMode(initialMode)
    setViewMode(getStoredViewMode())
    setErrorMessage(null)
    setStatusMessage(null)

    resolveProfile().then((nextProfile) => {
      setProfile(nextProfile)
      onAuthChange?.(nextProfile)
    })
  }, [initialMode, onAuthChange, open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  async function refreshProfile() {
    const nextProfile = await resolveProfile()
    setProfile(nextProfile)
    onAuthChange?.(nextProfile)
    return nextProfile
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        await login(email.trim(), password)
        setStatusMessage("Сессия активна")
      } else if (mode === "register") {
        await register(username.trim(), email.trim(), password)
        setStatusMessage("Аккаунт создан, сессия активна")
      }

      setPassword("")
      await refreshProfile()
      setMode("settings")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось выполнить действие")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      await logout()
      setProfile(null)
      onAuthChange?.(null)
      setStatusMessage("Вы вышли из аккаунта")
    } catch (error) {
      clearSessionId()
      setProfile(null)
      onAuthChange?.(null)
      setErrorMessage(error instanceof Error ? error.message : "Не удалось выйти")
    } finally {
      setIsSubmitting(false)
    }
  }

  function saveViewMode(nextMode: ViewMode) {
    setViewMode(nextMode)
    localStorage.setItem(viewModeKey, nextMode)
    window.dispatchEvent(new CustomEvent("cookly-settings-changed", { detail: { viewMode: nextMode } }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Закрыть окно"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(145deg,rgba(31,31,28,0.98),rgba(13,14,14,0.98))] text-stone-100 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400/80">Cookly</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 text-stone-300 transition hover:border-amber-400 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400/30"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[14rem_1fr]">
          <nav className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
            {[
              { key: "settings" as const, label: "Настройки", icon: Settings },
              { key: "login" as const, label: "Войти", icon: LogIn },
              { key: "register" as const, label: "Регистрация", icon: UserPlus },
            ].map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMode(item.key)
                    setErrorMessage(null)
                    setStatusMessage(null)
                  }}
                  className={cn(
                    "mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition",
                    mode === item.key
                      ? "bg-amber-400 text-stone-950"
                      : "text-stone-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="min-h-[26rem] p-6">
            {mode === "settings" ? (
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-semibold">Аккаунт</h3>
                  {profile ? (
                    <div className="mt-4 space-y-3 text-sm text-stone-300">
                      <p>
                        User ID: <span className="font-mono text-stone-100">{profile.userId}</span>
                      </p>
                      <p className="break-all">
                        Session ID: <span className="font-mono text-stone-100">{profile.sessionId}</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-400/40 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LogOut className="size-4" />
                        Выйти
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-sm text-stone-300">
                      <p>Сессия не активна. Войдите или зарегистрируйтесь, чтобы создавать рецепты и коллекции.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setMode("login")}
                          className="rounded-2xl bg-amber-400 px-4 py-2 font-medium text-stone-950 transition hover:bg-amber-300"
                        >
                          Войти
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("register")}
                          className="rounded-2xl border border-white/15 px-4 py-2 font-medium text-stone-100 transition hover:bg-white/10"
                        >
                          Создать аккаунт
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-semibold">Отображение</h3>
                  <p className="mt-2 text-sm text-stone-400">Режим по умолчанию для рецептов и коллекций.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                    <button
                      type="button"
                      onClick={() => saveViewMode("cards")}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm transition",
                        viewMode === "cards" ? "bg-emerald-400 text-stone-950" : "text-stone-300 hover:bg-white/10"
                      )}
                    >
                      Детальные карточки
                    </button>
                    <button
                      type="button"
                      onClick={() => saveViewMode("list")}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm transition",
                        viewMode === "list" ? "bg-emerald-400 text-stone-950" : "text-stone-300 hover:bg-white/10"
                      )}
                    >
                      Списки
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                {mode === "register" ? (
                  <label className="block text-sm font-medium text-stone-200" htmlFor="auth-username">
                    Имя пользователя
                    <input
                      id="auth-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20"
                      required
                    />
                  </label>
                ) : null}

                <label className="block text-sm font-medium text-stone-200" htmlFor="auth-email">
                  Email
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-stone-200" htmlFor="auth-password">
                  Пароль
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20"
                    required
                  />
                </label>

                {errorMessage ? (
                  <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</p>
                ) : null}

                {statusMessage ? (
                  <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{statusMessage}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Отправка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
