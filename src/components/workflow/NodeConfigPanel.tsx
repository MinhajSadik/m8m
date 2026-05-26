"use client"

import { useCallback } from "react"
import * as Icons from "lucide-react"
import { Trash2, Copy, X, Zap, ChevronDown } from "lucide-react"
import { useWorkflowStore } from "@/store/workflow-store"
import { getNodeDefinition } from "@/lib/node-definitions"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import type { NodeConfigField } from "@/types"

export function NodeConfigPanel({ nodeId }: { nodeId: string }) {
  const { nodes, updateNodeData, deleteNode, duplicateNode, setSelectedNode } =
    useWorkflowStore()
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const def = getNodeDefinition(node.data.type)
  const IconComponent = def?.icon
    ? (Icons[def.icon as keyof typeof Icons] as React.ComponentType<React.SVGProps<SVGSVGElement>>)
    : Zap

  const nodeColor = def?.color ?? "#7c3aed"

  function updateConfig(key: string, value: unknown) {
    updateNodeData(nodeId, {
      config: { ...(node!.data.config as Record<string, unknown>), [key]: value },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: nodeColor + "22", border: `1px solid ${nodeColor}44` }}
          >
            <IconComponent className="w-3.5 h-3.5" style={{ color: nodeColor }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-200">{def?.label ?? node.data.type}</p>
            <p className="text-[10px] text-zinc-600">{nodeId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => duplicateNode(nodeId)}
            title="Duplicate node"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:text-red-400"
            onClick={() => {
              deleteNode(nodeId)
              setSelectedNode(null)
            }}
            title="Delete node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelectedNode(null)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <Label>Node Name</Label>
          <Input
            value={node.data.label}
            onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        {def?.configSchema && def.configSchema.length > 0 && (
          <div className="h-px bg-zinc-800" />
        )}

        {def?.configSchema?.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={(node.data.config as Record<string, unknown>)[field.key]}
            onChange={(val) => updateConfig(field.key, val)}
          />
        ))}

        {(!def?.configSchema || def.configSchema.length === 0) && (
          <p className="text-xs text-zinc-600 text-center py-4">
            This node has no configuration options.
          </p>
        )}
      </div>
    </div>
  )
}

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: NodeConfigField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const strVal = value !== undefined && value !== null ? String(value) : ""

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-2">
        <Label>{field.label}</Label>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full border transition-colors ${
            value
              ? "bg-violet-600 border-violet-500"
              : "bg-zinc-800 border-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              value ? "left-4" : "left-0.5"
            }`}
          />
        </button>
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</Label>
        <div className="relative">
          <select
            value={strVal || String(field.default ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none h-8 rounded-md border border-zinc-700 bg-zinc-900 px-3 pr-8 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        </div>
        {field.description && (
          <p className="text-[10px] text-zinc-600">{field.description}</p>
        )}
      </div>
    )
  }

  if (field.type === "code" || field.type === "json") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</Label>
        <Textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="font-mono text-xs min-h-[120px]"
        />
        {field.description && (
          <p className="text-[10px] text-zinc-600">{field.description}</p>
        )}
      </div>
    )
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</Label>
        <Input
          type="number"
          value={strVal || String(field.default ?? "")}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          className="h-8 text-xs"
        />
        {field.description && (
          <p className="text-[10px] text-zinc-600">{field.description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</Label>
      <Input
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-8 text-xs"
      />
      {field.description && (
        <p className="text-[10px] text-zinc-600">{field.description}</p>
      )}
    </div>
  )
}
