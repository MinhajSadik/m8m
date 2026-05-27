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
    },
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

  function addStarterTemplate() {
    addNode(
      { type: "trigger.manual", label: "Manual Trigger", config: {}, color: "#f97316" },
      { x: 100, y: 200 }
    )
    setTimeout(() => {
      addNode(
        { type: "action.set", label: "Edit Fields", config: {}, color: "#8b5cf6" },
        { x: 400, y: 200 }
      )
    }, 50)
    setTimeout(() => {
      addNode(
        { type: "integration.slack", label: "Slack", config: {}, color: "#4a154b" },
        { x: 700, y: 200 }
      )
    }, 100)
  }

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
            edges={edges}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-4 pointer-events-auto">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-300 text-sm font-medium">Build your first workflow</p>
                  <p className="text-zinc-500 text-xs mt-1 max-w-[260px] mx-auto">
                    Drag nodes from the left panel onto the canvas, then connect them by dragging from one node&apos;s output handle to another&apos;s input.
                  </p>
                </div>
                <button
                  onClick={addStarterTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start with a template
                </button>
                <p className="text-zinc-600 text-[11px]">
                  Tip: You can also click any node in the left panel to add it instantly
                </p>
              </div>
            </div>
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
