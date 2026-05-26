"use client"

import { memo, useState } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { AlertCircle, CheckCircle, Clock, Loader2, Zap } from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import type { NodeData } from "@/types"
import { getNodeDefinition } from "@/lib/node-definitions"
import { useWorkflowStore } from "@/store/workflow-store"

function StatusIndicator({ status }: { status: NodeData["status"] }) {
  if (status === "running") {
    return (
      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-zinc-900">
        <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
      </span>
    )
  }
  if (status === "success") {
    return (
      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-zinc-900">
        <CheckCircle className="w-2.5 h-2.5 text-white" />
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-zinc-900">
        <AlertCircle className="w-2.5 h-2.5 text-white" />
      </span>
    )
  }
  if (status === "waiting") {
    return (
      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-zinc-900">
        <Clock className="w-2.5 h-2.5 text-white" />
      </span>
    )
  }
  return null
}

export const WorkflowNode = memo(function WorkflowNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as NodeData
  const { deleteNode } = useWorkflowStore()
  const def = getNodeDefinition(nodeData.type)

  const IconComponent = def?.icon
    ? (Icons[def.icon as keyof typeof Icons] as React.ComponentType<React.SVGProps<SVGSVGElement>>) ?? Zap
    : Zap

  const nodeColor = def?.color ?? "#7c3aed"
  const hasInputs = (def?.inputs ?? 1) > 0
  const hasOutputs = (def?.outputs ?? 1) > 0

  const isRunning = nodeData.status === "running"
  const isError = nodeData.status === "error"
  const isSuccess = nodeData.status === "success"

  return (
    <div
      className={cn(
        "relative group min-w-[160px] rounded-xl border bg-zinc-900 shadow-lg transition-all duration-150 cursor-pointer select-none",
        selected
          ? "border-violet-500 shadow-violet-500/20 shadow-xl ring-1 ring-violet-500/30"
          : isError
          ? "border-red-500/50 shadow-red-500/10"
          : isRunning
          ? "border-blue-500/50 shadow-blue-500/10"
          : isSuccess
          ? "border-emerald-500/30"
          : "border-zinc-700/80 hover:border-zinc-600"
      )}
    >
      {isRunning && (
        <div className="absolute inset-0 rounded-xl border border-blue-500/50 animate-ping opacity-30" />
      )}

      {hasInputs && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-zinc-800 !border-zinc-600 !w-3 !h-3 !rounded-full hover:!border-violet-400 hover:!bg-violet-900 transition-all"
          style={{ left: -6 }}
        />
      )}

      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: nodeColor + "22", border: `1px solid ${nodeColor}44` }}
        >
          <IconComponent className="w-4 h-4" style={{ color: nodeColor }} />
          <StatusIndicator status={nodeData.status} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-zinc-100 truncate leading-tight">
            {nodeData.label}
          </span>
          {nodeData.executionTime && (
            <span className="text-[10px] text-zinc-500 mt-0.5">
              {nodeData.executionTime}ms
            </span>
          )}
          {isError && nodeData.error && (
            <span className="text-[10px] text-red-400 mt-0.5 truncate max-w-[120px]">
              {nodeData.error}
            </span>
          )}
        </div>
      </div>

      {hasOutputs && (
        <>
          {(def?.outputs ?? 1) > 1 ? (
            Array.from({ length: def!.outputs }).map((_, i) => (
              <Handle
                key={i}
                type="source"
                position={Position.Right}
                id={`output-${i}`}
                className="!bg-zinc-800 !border-zinc-600 !w-3 !h-3 !rounded-full hover:!border-violet-400 hover:!bg-violet-900 transition-all"
                style={{
                  right: -6,
                  top: `${((i + 1) / (def!.outputs + 1)) * 100}%`,
                }}
              />
            ))
          ) : (
            <Handle
              type="source"
              position={Position.Right}
              className="!bg-zinc-800 !border-zinc-600 !w-3 !h-3 !rounded-full hover:!border-violet-400 hover:!bg-violet-900 transition-all"
              style={{ right: -6 }}
            />
          )}
        </>
      )}
    </div>
  )
})
