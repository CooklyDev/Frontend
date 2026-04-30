"use client"

import { useEffect } from "react"

export default function SettingsPage() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("open-cookly-settings", { detail: { mode: "settings" } }))
  }, [])

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center px-4 text-center text-stone-100">
      <p className="text-xs uppercase tracking-[0.4em] text-amber-300/80">Cookly settings</p>
      <h1 className="mt-4 text-4xl font-semibold">Настройки открыты в модальном окне</h1>
      <p className="mt-4 text-sm text-stone-400">Управляйте аккаунтом, входом и режимом отображения в едином окне.</p>
    </section>
  )
}
