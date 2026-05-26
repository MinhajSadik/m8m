"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Workflow,
  Play,
  Pause,
  Trash2,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  MoreVertical,
  Copy,
  ExternalLink,
  Tag,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelativeTime, getStatusBg } from "@/lib/utils"

type WorkflowSummary = {
  id: string
  name: string
  description?: string | null
  active: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  executionCount: number
  lastExecution?: {
    id: string
    status: string
    startedAt: string
    finishedAt?: string
    durationMs?: number | null
    mode: string
  }
}

export function WorkflowsClient({ workflows: initial }: { workflows: WorkflowSummary[] }) {
  const router = useRouter()
  const [workflows, setWorkflows] = useState(initial)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const filtered = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description?.toLowerCase().includes(search.toLowerCase()) ||
      w.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  async function createWorkflow() {
    setCreating(true)
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Workflow" }),
    })
    setCreating(false)
    if (!res.ok) {
      toast.error("Failed to create workflow")
      return
    }
    const data = await res.json()
    router.push(`/workflows/${data.id}`)
  }

  async function toggleActive(id: string, active: boolean) {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active: !active } : w)))
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })
    if (!res.ok) {
      setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)))
      toast.error("Failed to update workflow")
    } else {
      toast.success(!active ? "Workflow activated" : "Workflow deactivated")
    }
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete workflow")
      return
    }
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    toast.success("Workflow deleted")
  }

  async function duplicateWorkflow(id: string) {
    const res = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" })
    if (!res.ok) {
      toast.error("Failed to duplicate workflow")
      return
    }
    const data = await res.json()
    setWorkflows((prev) => [data, ...prev])
    toast.success("Workflow duplicated")
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Workflows</h1>
          <p className="text-xs text-zinc-500">{workflows.length} workflow{workflows.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              className="pl-8 w-52 h-8 text-xs"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={createWorkflow} disabled={creating}>
            <Plus className="w-4 h-4" />
            New workflow
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/60 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-zinc-400 font-medium">
                {search ? "No workflows match your search" : "No workflows yet"}
              </p>
              <p className="text-zinc-600 text-sm mt-1">
                {search ? "Try a different search term" : "Create your first workflow to get started"}
              </p>
            </div>
            {!search && (
              <Button size="sm" onClick={createWorkflow} disabled={creating}>
                <Plus className="w-4 h-4" />
                Create workflow
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onToggleActive={toggleActive}
                onDelete={deleteWorkflow}
                onDuplicate={duplicateWorkflow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkflowCard({
  workflow,
  onToggleActive,
  onDelete,
  onDuplicate,
}: {
  workflow: WorkflowSummary
  onToggleActive: (id: string, active: boolean) => void
  onDelete: (id: string, name: string) => void
  onDuplicate: (id: string) => void
}) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-200"
        style={{
          background: workflow.active
            ? "linear-gradient(90deg, #7c3aed, #3b82f6)"
            : "transparent",
          opacity: workflow.active ? 1 : 0,
        }}
      />

      <div className="flex items-start justify-between p-4">
        <Link href={`/workflows/${workflow.id}`} className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
            {workflow.name}
          </h3>
          {workflow.description && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{workflow.description}</p>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-2 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`/workflows/${workflow.id}`, "_blank")}>
              <ExternalLink className="w-4 h-4" />
              Open in editor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
              <Copy className="w-4 h-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
              onClick={() => onDelete(workflow.id, workflow.name)}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {workflow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {workflow.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </Badge>
          ))}
          {workflow.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">+{workflow.tags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 mt-auto border-t border-zinc-800/60">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {workflow.executionCount}
          </span>
          {workflow.lastExecution && (
            <span
              className={`flex items-center gap-1 ${
                workflow.lastExecution.status === "SUCCESS"
                  ? "text-emerald-500"
                  : workflow.lastExecution.status === "ERROR"
                  ? "text-red-500"
                  : "text-zinc-500"
              }`}
            >
              {workflow.lastExecution.status === "SUCCESS" ? (
                <CheckCircle className="w-3 h-3" />
              ) : workflow.lastExecution.status === "ERROR" ? (
                <XCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {formatRelativeTime(workflow.lastExecution.startedAt)}
            </span>
          )}
        </div>

        <button
          onClick={() => onToggleActive(workflow.id, workflow.active)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            workflow.active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          {workflow.active ? (
            <><Pause className="w-3 h-3" /> Active</>
          ) : (
            <><Play className="w-3 h-3" /> Inactive</>
          )}
        </button>
      </div>
    </div>
  )
}
