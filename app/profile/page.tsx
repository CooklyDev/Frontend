"use client"

import { useEffect } from "react"

export default function ProfilePage() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("open-cookly-settings", { detail: { mode: "settings" } }))
  }, [])

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center px-4 text-center text-stone-100">
      <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80">Cookly profile</p>
      <h1 className="mt-4 text-4xl font-semibold">Профиль открыт в настройках</h1>
      <p className="mt-4 text-sm text-stone-400">Информация о текущей сессии и выход доступны в модальном окне настроек.</p>
    </section>
  )
}
