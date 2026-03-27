import Navbar from "@/components/ui/navbar"
import React from "react"

import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body>
            <Navbar/>
            <main>{children}</main>
        </body>
        </html>
    )
}