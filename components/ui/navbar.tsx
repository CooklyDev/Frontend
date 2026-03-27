import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

const linkClassName =
  "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted focus:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export default function Navbar() {
  return (
    <header className="border-b border-border bg-background">
      <nav
        className="flex w-full items-center gap-2 px-4 py-3"
      >
        <Link href="/" className={cn(linkClassName, "font-semibold")}>
          Cookly
        </Link>
        <Link href="/recipes" className={linkClassName}>
          My recipes
        </Link>
        <Link
          href="/profile"
          className="ml-auto rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Image
            src="/default-avatar.svg"
            alt="Profile"
            width={40}
            height={40}
            className="size-10 rounded-full border border-border bg-muted object-cover"
          />
        </Link>
      </nav>
    </header>
  )
}
