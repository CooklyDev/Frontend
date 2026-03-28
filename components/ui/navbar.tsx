"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const linkClassName =
  "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted focus:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
const menuItemClassName =
  "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export default function Navbar() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false)
        setIsSearchOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  return (
    <header className="border-b border-border bg-background">
      <nav className="flex w-full items-center gap-2 px-4 py-3">
        <Link href="/" className={cn(linkClassName, "font-semibold")}>
          Cookly
        </Link>
        <Link href="/my-recipes" className={linkClassName}>
          My recipes
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div
            ref={searchRef}
            onMouseEnter={() => setIsSearchOpen(true)}
            onMouseLeave={() => setIsSearchOpen(false)}
            className="relative"
          >
            <button
              type="button"
              aria-expanded={isSearchOpen}
              aria-label="Open search"
              className={cn(
                "rounded-full p-2 transition-all duration-200 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isSearchOpen ? "opacity-0 scale-95" : "opacity-100 scale-100"
              )}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
            </button>
            <div
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 w-72 transition-all duration-200 ease-out",
                isSearchOpen
                  ? "opacity-100 scale-100"
                  : "pointer-events-none opacity-0 scale-95"
              )}
            >
              <label className="sr-only" htmlFor="navbar-search">
                Search
              </label>
              <input
                id="navbar-search"
                type="search"
                placeholder="Search recipes"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
            </div>
          </div>
          <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            onClick={() => setIsProfileMenuOpen((currentState) => !currentState)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image
              src="/default-avatar.svg"
              alt="Profile"
              width={40}
              height={40}
              loading="eager"
              className="size-10 rounded-full border border-border bg-muted object-cover"
            />
          </button>
          {isProfileMenuOpen ? (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 top-full z-10 mt-2 min-w-44 rounded-2xl border border-border bg-background p-2 shadow-lg"
            >
              <Link
                href="/profile"
                role="menuitem"
                className={menuItemClassName}
                onClick={() => setIsProfileMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                className={menuItemClassName}
                onClick={() => setIsProfileMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                className={menuItemClassName}
                onClick={() => setIsProfileMenuOpen(false)}
              >
                Logout
              </button>
            </div>
          ) : null}
          </div>
        </div>
      </nav>
    </header>
  )
}
