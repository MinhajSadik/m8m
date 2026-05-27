"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Play,
  Save,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Terminal,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { useWorkflowStore } from "@/store/workflow-store"
import { formatRelativeTime } from "@/lib/utils"

export function EditorToolbar({
  onToggleExecutionPanel,
  showExecutionPanel,
}: {
  onToggleExecutionPanel: () => void
  showExecutionPanel: boolean
}) {
  const router = useRouter()
  const {
    workflow,
    nodes,
    edges,
    isDirty,
    isSaving,
    isExecuting,
    panelOpen,
    setPanelOpen,
    setIsSaving,
    setIsExecuting,
    markClean,
    updateWorkflowName,
    toggleWorkflowActive,
    undo,
    redo,
    historyIndex,
    historyStack,
    setNodeStatus,
    clearNodeStatuses,
  } = useWorkflowStore()

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(workflow?.name ?? "")

  async function handleSave() {
    if (!workflow || isSaving) return
    setIsSaving(true)
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges, name: workflow.name }),
    })
    setIsSaving(false)
    if (!res.ok) {
      toast.error("Failed to save workflow")
      return
    }
    markClean()
    toast.success("Saved")
  }

  async function handleExecute() {
    if (!workflow || isExecuting) return
    clearNodeStatuses()
    setIsExecuting(true)

    for (const node of nodes) {
      setNodeStatus(node.id, "waiting")
    }

    const res = await fetch(`/api/workflows/${workflow.id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges }),
    })

    if (!res.ok) {
      setIsExecuting(false)
      clearNodeStatuses()
      toast.error("Execution failed")
      return
    }

    const data = await res.json()
    const steps: { nodeId: string; status: string; durationMs: number; nodeName: string; error?: string }[] = data.steps ?? []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      setNodeStatus(step.nodeId, "running")
      await new Promise((r) => setTimeout(r, 400))
      setNodeStatus(step.nodeId, step.status === "SUCCESS" ? "success" : "error")
      await new Promise((r) => setTimeout(r, 200))
    }

    setIsExecuting(false)

    if (data.status === "SUCCESS") {
      toast.success(`Workflow executed successfully (${data.durationMs}ms, ${steps.length} steps)`)
    } else {
      toast.error(`Execution failed: ${data.error ?? "Unknown error"}`)
    }
  }

  function handleNameSubmit() {
    setEditingName(false)
    if (nameValue.trim() && nameValue !== workflow?.name) {
      updateWorkflowName(nameValue.trim())
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 h-12 border-b border-zinc-800/60 bg-zinc-950 flex-shrink-0">
      <div className="flex items-center gap-1">
        <Tooltip content="Back to workflows">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/workflows")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Tooltip>

        <Tooltip content={panelOpen ? "Hide node panel" : "Show node panel"}>
          <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(!panelOpen)}>
            {panelOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </Button>
        </Tooltip>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-1">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit()
              if (e.key === "Escape") setEditingName(false)
            }}
            className="bg-transparent border-b border-violet-500 text-sm font-medium text-zinc-100 focus:outline-none px-1 min-w-0 max-w-[200px]"
          />
        ) : (
          <button
            onClick={() => {
              setNameValue(workflow?.name ?? "")
              setEditingName(true)
            }}
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-1 truncate max-w-[200px]"
            title="Click to rename"
          >
            {workflow?.name ?? "Loading..."}
          </button>
        )}

        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip content="Undo (Cmd+Z)">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Redo (Cmd+Shift+Z)">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={historyIndex >= historyStack.length - 1}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </Tooltip>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        <Tooltip content={showExecutionPanel ? "Hide execution log" : "Show execution log"}>
          <Button
            variant={showExecutionPanel ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={onToggleExecutionPanel}
          >
            <Terminal className="w-4 h-4" />
          </Button>
        </Tooltip>

        <Tooltip content="View version history">
          <Button variant="ghost" size="icon-sm">
            <History className="w-4 h-4" />
          </Button>
        </Tooltip>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        <button
          onClick={toggleWorkflowActive}
          className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
            workflow?.active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${workflow?.active ? "bg-emerald-400" : "bg-zinc-600"}`}
          />
          {workflow?.active ? "Active" : "Inactive"}
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="ml-1"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </Button>

        <Button
          size="sm"
          onClick={handleExecute}
          disabled={isExecuting || nodes.length === 0}
          className="relative"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isExecuting ? "Running..." : "Execute"}
        </Button>
      </div>
    </div>
  )
}
