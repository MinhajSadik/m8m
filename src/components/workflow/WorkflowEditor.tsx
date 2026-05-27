"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  SelectionMode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWorkflowStore } from "@/store/workflow-store"
import { WorkflowNode } from "./WorkflowNode"
import { NodePanel } from "./NodePanel"
import { NodeConfigPanel } from "./NodeConfigPanel"
import { EditorToolbar } from "./EditorToolbar"
import { ExecutionPanel } from "./ExecutionPanel"
import type { WorkflowData } from "@/types"
import type { NodeData } from "@/types"
import type { Node } from "@xyflow/react"
import { NODE_DEFINITIONS } from "@/lib/node-definitions"

const nodeTypes = {
  workflowNode: WorkflowNode,
}

export function WorkflowEditor({ workflow }: { workflow: WorkflowData }) {
  const {
    nodes,
    edges,
    setWorkflow,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    setSelectedNode,
    executionNodeStatuses,
    executionNodeTimes,
    activeEdges,
    panelOpen,
    addNode,
  } = useWorkflowStore()

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [showExecutionPanel, setShowExecutionPanel] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  useEffect(() => {
    setWorkflow(workflow)
  }, [workflow, setWorkflow])

  const nodesWithStatus = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      status: executionNodeStatuses[node.id] ?? node.data.status ?? "idle",
      executionTime: executionNodeTimes[node.id],
    },
  }))

  const edgesWithAnimation = edges.map((edge) => ({
    ...edge,
    animated: activeEdges.has(edge.id),
    style: activeEdges.has(edge.id)
      ? { strokeWidth: 2.5, stroke: "#22c55e" }
      : { strokeWidth: 2, stroke: "#52525b" },
  }))

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData("application/m8m-node")
      if (!raw) return
      const def = JSON.parse(raw)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode(
        { type: def.type, label: def.label, config: {}, color: def.color },
        position
      )
    },
    [screenToFlowPosition, addNode]
  )

  return (
    <div className="flex h-full w-full bg-zinc-950">
      {panelOpen && (
        <div className="w-64 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-950 z-10">
          <NodePanel />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <EditorToolbar
          onToggleExecutionPanel={() => setShowExecutionPanel((p) => !p)}
          showExecutionPanel={showExecutionPanel}
        />

        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodesWithStatus}
            edges={edgesWithAnimation}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            selectionMode={SelectionMode.Partial}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: "#52525b" },
              type: "smoothstep",
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#27272a"
            />
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              nodeColor={(node) => {
                const status = (node.data as NodeData).status
                if (status === "running") return "#3b82f6"
                if (status === "success") return "#10b981"
                if (status === "error") return "#ef4444"
                return "#3f3f46"
              }}
              maskColor="rgba(0,0,0,0.4)"
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <TriggerPicker onSelect={(def) => {
              addNode(
                { type: def.type, label: def.label, config: {}, color: def.color },
                { x: 300, y: 250 }
              )
            }} />
          )}
        </div>
      </div>

      {selectedNodeId && (
        <div className="w-80 flex-shrink-0 border-l border-zinc-800/60 bg-zinc-950 z-10 overflow-y-auto">
          <NodeConfigPanel nodeId={selectedNodeId} />
        </div>
      )}

      {showExecutionPanel && (
        <div className="absolute bottom-0 left-64 right-0 h-72 border-t border-zinc-800/60 bg-zinc-950 z-20">
          <ExecutionPanel onClose={() => setShowExecutionPanel(false)} />
        </div>
      )}
    </div>
  )
}

const triggers = NODE_DEFINITIONS.filter((d) => d.category === "triggers")

function TriggerPicker({ onSelect }: { onSelect: (def: typeof NODE_DEFINITIONS[number]) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative pointer-events-auto">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-900/40 transition-all hover:scale-110"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-56 rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-zinc-400 text-[11px] font-medium uppercase tracking-wide">Choose a trigger</p>
            </div>
            {triggers.map((def) => (
              <button
                key={def.type}
                onClick={() => { onSelect(def); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: def.color + "20", border: `1px solid ${def.color}40` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: def.color }} />
                </div>
                <div>
                  <p className="text-zinc-200 text-sm font-medium">{def.label}</p>
                  <p className="text-zinc-500 text-[11px]">{def.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
