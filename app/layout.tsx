import Navbar from "@/components/ui/navbar"
import type { Metadata } from "next"
import React from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "Cookly",
  description: "Recipe and collection workspace",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
