"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Workflow,
  ListChecks,
  KeyRound,
  Settings,
  Plus,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"

const navItems = [
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/executions", label: "Executions", icon: ListChecks },
  { href: "/credentials", label: "Credentials", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role

  return (
    <aside className="flex h-full w-14 flex-col items-center border-r border-zinc-800/60 bg-zinc-950 py-3 gap-1">
      <Link
        href="/workflows"
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors mb-3"
      >
        <Workflow className="w-4 h-4 text-white" />
      </Link>

      <div className="w-full px-2 mb-1">
        <Tooltip content="New Workflow" side="right">
          <Link
            href="/workflows/new"
            className="flex items-center justify-center w-full h-9 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-violet-500 hover:text-violet-400 transition-all"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </Tooltip>
      </div>

      <div className="h-px w-8 bg-zinc-800 my-1" />

      <nav className="flex flex-col items-center gap-1 w-full px-2 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Tooltip key={href} content={label} side="right">
              <Link
                href={href}
                className={cn(
                  "flex items-center justify-center w-full h-9 rounded-lg transition-all",
                  isActive
                    ? "bg-violet-600/20 text-violet-400"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <Icon className="w-4 h-4" />
              </Link>
            </Tooltip>
          )
        })}
      </nav>

      {role === "admin" && (
        <>
          <div className="h-px w-8 bg-zinc-800 my-1" />
          <div className="w-full px-2">
            <Tooltip content="Admin" side="right">
              <Link
                href="/admin"
                className={cn(
                  "flex items-center justify-center w-full h-9 rounded-lg transition-all",
                  pathname.startsWith("/admin")
                    ? "bg-amber-600/20 text-amber-400"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <Shield className="w-4 h-4" />
              </Link>
            </Tooltip>
          </div>
        </>
      )}
    </aside>
  )
}
