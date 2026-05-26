import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export function generateWebhookPath(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20)
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "text-emerald-400",
    ERROR: "text-red-400",
    RUNNING: "text-blue-400",
    PENDING: "text-zinc-400",
    CANCELLED: "text-zinc-500",
    WAITING: "text-amber-400",
    success: "text-emerald-400",
    error: "text-red-400",
    running: "text-blue-400",
    idle: "text-zinc-400",
    waiting: "text-amber-400",
  }
  return map[status] ?? "text-zinc-400"
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ERROR: "bg-red-500/10 text-red-400 border-red-500/20",
    RUNNING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PENDING: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    CANCELLED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    WAITING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }
  return map[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
}
