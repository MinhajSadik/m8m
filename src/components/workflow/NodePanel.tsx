"use client"

import { useState, useMemo } from "react"
import { useReactFlow } from "@xyflow/react"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import * as Icons from "lucide-react"
import { Input } from "@/components/ui/input"
import { NODE_DEFINITIONS, NODE_CATEGORIES } from "@/lib/node-definitions"
import { useWorkflowStore } from "@/store/workflow-store"
import type { NodeDefinition } from "@/types"
import { cn } from "@/lib/utils"

export function NodePanel() {
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const { addNode } = useWorkflowStore()
  const { screenToFlowPosition } = useReactFlow()

  const filtered = useMemo(() => {
    if (!search) return NODE_DEFINITIONS
    const q = search.toLowerCase()
    return NODE_DEFINITIONS.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.includes(q))
    )
  }, [search])

  const grouped = useMemo(() => {
    return NODE_CATEGORIES.map((cat) => ({
      ...cat,
      nodes: filtered.filter((n) => n.category === cat.id),
    })).filter((cat) => cat.nodes.length > 0)
  }, [filtered])

  function toggleCategory(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDragStart(event: React.DragEvent, def: NodeDefinition) {
    event.dataTransfer.setData("application/m8m-node", JSON.stringify(def))
    event.dataTransfer.effectAllowed = "move"
  }

  function handleNodeClick(def: NodeDefinition) {
    addNode(
      {
        type: def.type,
        label: def.label,
        config: {},
        color: def.color,
      },
      { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 }
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-zinc-800/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {grouped.map((category) => (
          <div key={category.id} className="mb-1">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
            >
              {collapsed.has(category.id) ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.label}
              <span className="ml-auto text-zinc-700">{category.nodes.length}</span>
            </button>

            {!collapsed.has(category.id) && (
              <div className="px-2 pb-1">
                {category.nodes.map((def) => (
                  <NodeItem
                    key={def.type}
                    def={def}
                    onDragStart={handleDragStart}
                    onClick={handleNodeClick}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-zinc-500 text-xs">No nodes match &quot;{search}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NodeItem({
  def,
  onDragStart,
  onClick,
}: {
  def: NodeDefinition
  onDragStart: (e: React.DragEvent, def: NodeDefinition) => void
  onClick: (def: NodeDefinition) => void
}) {
  const IconComponent = def.icon
    ? (Icons[def.icon as keyof typeof Icons] as React.ComponentType<React.SVGProps<SVGSVGElement>>)
    : null

  return (
    <button
      draggable
      onDragStart={(e) => onDragStart(e, def)}
      onClick={() => onClick(def)}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-zinc-800/70 transition-all group cursor-grab active:cursor-grabbing"
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: def.color + "22", border: `1px solid ${def.color}44` }}
      >
        {IconComponent && <IconComponent className="w-3.5 h-3.5" style={{ color: def.color }} />}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 truncate leading-tight">
          {def.label}
        </span>
        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 truncate leading-tight mt-0.5">
          {def.description}
        </span>
      </div>
    </button>
  )
}
