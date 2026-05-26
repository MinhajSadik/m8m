"use client"

import { useEffect, useState } from "react"
import { useWorkflowStore } from "@/store/workflow-store"
import { CheckCircle, XCircle, Clock, Loader2, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDuration, formatRelativeTime, getStatusBg } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ExecutionDetail } from "@/types"

export function ExecutionPanel({ onClose }: { onClose: () => void }) {
  const { workflow } = useWorkflowStore()
  const [executions, setExecutions] = useState<ExecutionDetail[]>([])
  const [selected, setSelected] = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workflow) return
    setLoading(true)
    fetch(`/api/workflows/${workflow.id}/executions`)
      .then((r) => r.json())
      .then((data) => {
        setExecutions(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workflow])

  return (
    <div className="flex h-full">
      <div className="w-72 flex-shrink-0 border-r border-zinc-800/60 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Execution Log</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            </div>
          ) : executions.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-zinc-500">No executions yet</p>
            </div>
          ) : (
            executions.map((exec) => (
              <button
                key={exec.id}
                onClick={() => setSelected(exec)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/40 ${
                  selected?.id === exec.id ? "bg-zinc-800/60" : ""
                }`}
              >
                {exec.status === "SUCCESS" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : exec.status === "ERROR" ? (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                ) : exec.status === "RUNNING" ? (
                  <Loader2 className="w-4 h-4 text-blue-400 flex-shrink-0 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300 truncate">{exec.mode}</span>
                    {exec.durationMs && (
                      <span className="text-[10px] text-zinc-600">{formatDuration(exec.durationMs)}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatRelativeTime(exec.startedAt)}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-700" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={selected.status === "SUCCESS" ? "success" : selected.status === "ERROR" ? "error" : "default"}>
                {selected.status}
              </Badge>
              <span className="text-xs text-zinc-500">{selected.mode}</span>
              {selected.durationMs && (
                <span className="text-xs text-zinc-500">{formatDuration(selected.durationMs)}</span>
              )}
            </div>

            {selected.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400 font-mono">{selected.error}</p>
              </div>
            )}

            <div className="space-y-2">
              {selected.steps?.map((step) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {step.status === "SUCCESS" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : step.status === "ERROR" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className="text-xs font-medium text-zinc-300">{step.nodeName}</span>
                    <span className="text-[10px] text-zinc-600">{step.nodeType}</span>
                    {step.durationMs && (
                      <span className="ml-auto text-[10px] text-zinc-600">{formatDuration(step.durationMs)}</span>
                    )}
                  </div>
                  {step.error && (
                    <p className="text-[10px] text-red-400 font-mono mt-1 bg-red-500/5 rounded px-2 py-1">
                      {step.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-600">Select an execution to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
