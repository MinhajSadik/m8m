import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { Node, Edge, Connection, NodeChange, EdgeChange } from "@xyflow/react"
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react"
import type { NodeData, WorkflowData, WorkflowSettings } from "@/types"
import { v4 as uuidv4 } from "uuid"

interface WorkflowStore {
  workflow: WorkflowData | null
  nodes: Node<NodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  isDirty: boolean
  isSaving: boolean
  isExecuting: boolean
  executionNodeStatuses: Record<string, NodeData["status"]>
  executionNodeTimes: Record<string, number>
  executionProgress: { current: number; total: number } | null
  activeEdges: Set<string>
  panelOpen: boolean
  historyStack: { nodes: Node<NodeData>[]; edges: Edge[] }[]
  historyIndex: number

  setWorkflow: (workflow: WorkflowData) => void
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (nodeData: Partial<NodeData> & { type: string }, position?: { x: number; y: number }) => void
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  setSelectedNode: (nodeId: string | null) => void
  setPanelOpen: (open: boolean) => void
  setIsSaving: (saving: boolean) => void
  setIsExecuting: (executing: boolean) => void
  setNodeStatus: (nodeId: string, status: NodeData["status"]) => void
  setNodeExecutionTime: (nodeId: string, ms: number) => void
  setExecutionProgress: (progress: { current: number; total: number } | null) => void
  setActiveEdge: (edgeId: string, active: boolean) => void
  clearActiveEdges: () => void
  clearNodeStatuses: () => void
  updateWorkflowName: (name: string) => void
  updateWorkflowSettings: (settings: Partial<WorkflowSettings>) => void
  toggleWorkflowActive: () => void
  markDirty: () => void
  markClean: () => void
  undo: () => void
  redo: () => void
  pushHistory: () => void
}

const MAX_HISTORY = 50

export const useWorkflowStore = create<WorkflowStore>()(
  subscribeWithSelector((set, get) => ({
    workflow: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,
    isSaving: false,
    isExecuting: false,
    executionNodeStatuses: {},
    executionNodeTimes: {},
    executionProgress: null,
    activeEdges: new Set(),
    panelOpen: true,
    historyStack: [],
    historyIndex: -1,

    setWorkflow: (workflow) => {
      set({
        workflow,
        nodes: workflow.nodes as Node<NodeData>[],
        edges: workflow.edges,
        isDirty: false,
        historyStack: [],
        historyIndex: -1,
      })
    },

    onNodesChange: (changes) => {
      set((state) => {
        const newNodes = applyNodeChanges(changes, state.nodes)
        return { nodes: newNodes, isDirty: true }
      })
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const newEdges = applyEdgeChanges(changes, state.edges)
        return { edges: newEdges, isDirty: true }
      })
    },

    onConnect: (connection) => {
      get().pushHistory()
      set((state) => ({
        edges: addEdge({ ...connection, id: uuidv4(), animated: false }, state.edges),
        isDirty: true,
      }))
    },

    addNode: (nodeData, position = { x: 300, y: 200 }) => {
      get().pushHistory()
      const { type: nodeType, label, config, ...rest } = nodeData
      const newNode: Node<NodeData> = {
        id: uuidv4(),
        type: "workflowNode",
        position,
        data: {
          label: label ?? "New Node",
          type: nodeType as NodeData["type"],
          config: config ?? {},
          status: "idle",
          ...rest,
        },
      }
      set((state) => ({
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
        isDirty: true,
      }))
    },

    updateNodeData: (nodeId, data) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        ),
        isDirty: true,
      }))
    },

    deleteNode: (nodeId) => {
      get().pushHistory()
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isDirty: true,
      }))
    },

    duplicateNode: (nodeId) => {
      get().pushHistory()
      const state = get()
      const node = state.nodes.find((n) => n.id === nodeId)
      if (!node) return
      const newNode: Node<NodeData> = {
        ...node,
        id: uuidv4(),
        position: { x: node.position.x + 60, y: node.position.y + 60 },
        selected: false,
      }
      set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }))
    },

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
    setPanelOpen: (open) => set({ panelOpen: open }),
    setIsSaving: (saving) => set({ isSaving: saving }),
    setIsExecuting: (executing) => set({ isExecuting: executing }),

    setNodeStatus: (nodeId, status) =>
      set((state) => ({
        executionNodeStatuses: { ...state.executionNodeStatuses, [nodeId]: status },
      })),

    setNodeExecutionTime: (nodeId, ms) =>
      set((state) => ({
        executionNodeTimes: { ...state.executionNodeTimes, [nodeId]: ms },
      })),

    setExecutionProgress: (progress) => set({ executionProgress: progress }),

    setActiveEdge: (edgeId, active) =>
      set((state) => {
        const newSet = new Set(state.activeEdges)
        if (active) newSet.add(edgeId)
        else newSet.delete(edgeId)
        return { activeEdges: newSet }
      }),

    clearActiveEdges: () => set({ activeEdges: new Set() }),

    clearNodeStatuses: () => set({ executionNodeStatuses: {}, executionNodeTimes: {}, executionProgress: null, activeEdges: new Set() }),

    updateWorkflowName: (name) =>
      set((state) => ({
        workflow: state.workflow ? { ...state.workflow, name } : null,
        isDirty: true,
      })),

    updateWorkflowSettings: (settings) =>
      set((state) => ({
        workflow: state.workflow
          ? { ...state.workflow, settings: { ...state.workflow.settings, ...settings } }
          : null,
        isDirty: true,
      })),

    toggleWorkflowActive: () =>
      set((state) => ({
        workflow: state.workflow
          ? { ...state.workflow, active: !state.workflow.active }
          : null,
        isDirty: true,
      })),

    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),

    pushHistory: () => {
      const { nodes, edges, historyStack, historyIndex } = get()
      const newStack = historyStack.slice(0, historyIndex + 1)
      newStack.push({ nodes: [...nodes], edges: [...edges] })
      if (newStack.length > MAX_HISTORY) newStack.shift()
      set({ historyStack: newStack, historyIndex: newStack.length - 1 })
    },

    undo: () => {
      const { historyStack, historyIndex } = get()
      if (historyIndex <= 0) return
      const prev = historyStack[historyIndex - 1]
      set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1, isDirty: true })
    },

    redo: () => {
      const { historyStack, historyIndex } = get()
      if (historyIndex >= historyStack.length - 1) return
      const next = historyStack[historyIndex + 1]
      set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1, isDirty: true })
    },
  }))
)
