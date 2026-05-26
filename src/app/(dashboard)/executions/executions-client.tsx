"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  Search,
  Filter,
  Workflow,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDuration, formatRelativeTime, getStatusBg } from "@/lib/utils"

type Execution = {
  id: string
  workflowId: string
  workflowName: string
  status: string
  mode: string
  startedAt: string
  finishedAt?: string
  durationMs?: number | null
  error?: string | null
  steps: {
    id: string
    nodeId: string
    nodeName: string
    nodeType: string
    status: string
    startedAt: string
    finishedAt?: string
    durationMs?: number | null
    error?: string | null
  }[]
}

export function ExecutionsClient({ executions }: { executions: Execution[] }) {
  const [selected, setSelected] = useState<Execution | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const filtered = executions.filter((e) => {
    const matchSearch =
      e.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      e.id.includes(search)
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Executions</h1>
            <p className="text-xs text-zinc-500">{executions.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                className="pl-8 w-48 h-8 text-xs"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              {["ALL", "SUCCESS", "ERROR", "RUNNING"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded transition-all ${
                    statusFilter === s
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-6 h-6 text-zinc-600" />
              <p className="text-zinc-500 text-sm">No executions found</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800/60">
                <tr>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Workflow</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Mode</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Started</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Steps</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exec) => (
                  <tr
                    key={exec.id}
                    onClick={() => setSelected(exec === selected ? null : exec)}
                    className={`border-b border-zinc-800/40 cursor-pointer transition-colors hover:bg-zinc-900/50 ${
                      selected?.id === exec.id ? "bg-zinc-900/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {exec.status === "SUCCESS" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : exec.status === "ERROR" ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : exec.status === "RUNNING" ? (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className={
                          exec.status === "SUCCESS" ? "text-emerald-400" :
                          exec.status === "ERROR" ? "text-red-400" :
                          exec.status === "RUNNING" ? "text-blue-400" : "text-zinc-500"
                        }>{exec.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/workflows/${exec.workflowId}`}
                        className="text-zinc-300 hover:text-violet-400 flex items-center gap-1.5 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Workflow className="w-3.5 h-3.5" />
                        {exec.workflowName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{exec.mode}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {exec.durationMs ? formatDuration(exec.durationMs) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatRelativeTime(exec.startedAt)}</td>
                    <td className="px-4 py-3 text-zinc-500">{exec.steps.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-zinc-800/60 bg-zinc-950 overflow-y-auto">
          <div className="px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-300">Execution Details</p>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">{selected.id}</p>
          </div>

          <div className="p-4 space-y-3">
            {selected.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400 font-mono">{selected.error}</p>
              </div>
            )}

            <div className="space-y-2">
              {selected.steps.map((step, i) => (
                <div key={step.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 w-4 text-[10px] text-right">{i + 1}</span>
                    {step.status === "SUCCESS" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : step.status === "ERROR" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className="text-xs font-medium text-zinc-300 flex-1 truncate">{step.nodeName}</span>
                    {step.durationMs && (
                      <span className="text-[10px] text-zinc-600">{formatDuration(step.durationMs)}</span>
                    )}
                  </div>
                  {step.error && (
                    <p className="text-[10px] text-red-400 font-mono mt-1.5 bg-red-500/5 rounded px-2 py-1">
                      {step.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
