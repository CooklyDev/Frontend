"use client"

import { AuthSettingsModal } from "@/components/cookly/auth-settings-modal"
import { clearSessionId, logout, resolveProfile } from "@/lib/cookly/api"
import type { AuthProfile } from "@/lib/cookly/types"
import { cn } from "@/lib/utils"
import { ChefHat, Menu, Search, Settings, UserRound, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"

type ModalMode = "settings" | "login" | "register"

const navLinkClass =
  "rounded-2xl px-4 py-2 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-stone-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400/30"

export default function Navbar() {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "guest">("loading")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsMode, setSettingsMode] = useState<ModalMode>("settings")
  const [searchQuery, setSearchQuery] = useState("")
  const pathname = usePathname()
  const router = useRouter()
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const refreshProfile = useCallback(async () => {
    setAuthState("loading")
    const nextProfile = await resolveProfile()
    setProfile(nextProfile)
    setAuthState(nextProfile ? "authenticated" : "guest")
  }, [])

  const handleAuthChange = useCallback((nextProfile: AuthProfile | null) => {
    setProfile(nextProfile)
    setAuthState(nextProfile ? "authenticated" : "guest")
  }, [])

  useEffect(() => {
    refreshProfile()

    function handleSessionChange() {
      refreshProfile()
    }

    function handleOpenSettings(event: Event) {
      const detail = (event as CustomEvent<{ mode?: ModalMode }>).detail
      setSettingsMode(detail?.mode ?? "settings")
      setIsSettingsOpen(true)
      setIsProfileMenuOpen(false)
      setIsMenuOpen(false)
    }

    window.addEventListener("session-changed", handleSessionChange)
    window.addEventListener("open-cookly-settings", handleOpenSettings)

    return () => {
      window.removeEventListener("session-changed", handleSessionChange)
      window.removeEventListener("open-cookly-settings", handleOpenSettings)
    }
  }, [refreshProfile])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false)
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileMenuOpen(false)
  }, [pathname])

  function openSettings(mode: ModalMode) {
    setSettingsMode(mode)
    setIsSettingsOpen(true)
    setIsProfileMenuOpen(false)
    setIsMenuOpen(false)
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      clearSessionId()
      setProfile(null)
      setAuthState("guest")
    } finally {
      setIsProfileMenuOpen(false)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchQuery.trim()
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/")
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-stone-950/80 text-stone-100 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-2xl pr-3 text-stone-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400/30">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20">
              <ChefHat className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Cookly</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link href="/" className={cn(navLinkClass, pathname === "/" && "bg-white/10 text-stone-50")}>Main</Link>
            <Link href="/my-recipes" className={cn(navLinkClass, pathname === "/my-recipes" && "bg-white/10 text-stone-50")}>Home</Link>
          </div>

          <form className="ml-auto hidden w-full max-w-sm lg:block" onSubmit={handleSearchSubmit}>
            <label className="relative block" htmlFor="navbar-search">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
              <input
                id="navbar-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search recipes"
                className="w-full rounded-2xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-4 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <button
              type="button"
              onClick={() => openSettings("settings")}
              className="hidden rounded-2xl border border-white/10 p-2.5 text-stone-300 transition hover:border-amber-400/50 hover:text-amber-300 md:inline-flex"
              aria-label="Открыть настройки"
            >
              <Settings className="size-5" />
            </button>

            {authState === "authenticated" ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 p-1.5 pr-3 text-sm text-stone-300 transition hover:border-emerald-400/50 hover:text-stone-50"
                >
                  <Image src="/default-avatar.svg" alt="Profile" width={36} height={36} className="size-9 rounded-xl bg-stone-800" />
                  <span className="hidden max-w-24 truncate sm:inline">{profile?.userId.slice(0, 8)}</span>
                </button>
                {isProfileMenuOpen ? (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-3xl border border-white/10 bg-stone-950 p-2 shadow-2xl shadow-black/40">
                    <button type="button" role="menuitem" onClick={() => openSettings("settings")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-stone-300 transition hover:bg-white/10 hover:text-stone-50">
                      <UserRound className="size-4" />
                      Profile & settings
                    </button>
                    <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-red-200 transition hover:bg-red-500/10">
                      <X className="size-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : authState === "guest" ? (
              <div className="hidden items-center gap-2 sm:flex">
                <button type="button" onClick={() => openSettings("login")} className="rounded-2xl px-4 py-2 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-stone-50">
                  Войти
                </button>
                <button type="button" onClick={() => openSettings("register")} className="rounded-2xl bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-300">
                  Регистрация
                </button>
              </div>
            ) : null}

            <button type="button" onClick={() => setIsMenuOpen((current) => !current)} className="rounded-2xl border border-white/10 p-2.5 text-stone-300 transition hover:border-amber-400/50 hover:text-amber-300 md:hidden" aria-label="Открыть меню">
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="mx-auto max-w-7xl space-y-3">
              <form onSubmit={handleSearchSubmit}>
                <label className="relative block" htmlFor="mobile-navbar-search">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                  <input
                    id="mobile-navbar-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search recipes"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-stone-100 outline-none"
                  />
                </label>
              </form>
              <div className="grid gap-2">
                <Link href="/" className={navLinkClass}>Main</Link>
                <Link href="/my-recipes" className={navLinkClass}>Home</Link>
                <button type="button" onClick={() => openSettings("settings")} className="rounded-2xl px-4 py-2 text-left text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-stone-50">Settings</button>
                {authState === "guest" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => openSettings("login")} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-stone-100">Войти</button>
                    <button type="button" onClick={() => openSettings("register")} className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950">Регистрация</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <AuthSettingsModal
        open={isSettingsOpen}
        initialMode={settingsMode}
        onClose={() => setIsSettingsOpen(false)}
        onAuthChange={handleAuthChange}
      />
    </>
  )
}
