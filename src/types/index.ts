import type { Node, Edge } from "@xyflow/react"

export type NodeType =
  | "trigger.manual"
  | "trigger.webhook"
  | "trigger.schedule"
  | "action.http"
  | "action.code"
  | "action.set"
  | "logic.if"
  | "logic.switch"
  | "logic.merge"
  | "logic.loop"
  | "integration.slack"
  | "integration.discord"
  | "integration.email"
  | "integration.github"
  | "integration.notion"
  | "integration.openai"
  | "integration.postgres"
  | "integration.sheets"
  | "integration.telegram"
  | "integration.stripe"
  | "integration.whatsapp"
  | "integration.facebook"
  | "integration.youtube"
  | "integration.twitter"
  | "integration.instagram"
  | "integration.linkedin"
  | "integration.drive"
  | "integration.spotify"
  | "integration.tiktok"
  | "integration.shopify"
  | "integration.twilio"
  | "integration.mongodb"
  | "integration.s3"
  | "integration.firebase"
  | "integration.hubspot"
  | "integration.airtable"
  | "integration.zoom"
  | "integration.calendly"
  | "integration.jira"
  | "integration.mailchimp"
  | "integration.dropbox"
  | "integration.redis"
  | "integration.openrouter"
  | "integration.supabase"

export interface NodeData extends Record<string, unknown> {
  label: string
  type: NodeType
  description?: string
  icon?: string
  color?: string
  config: Record<string, unknown>
  status?: "idle" | "running" | "success" | "error" | "waiting"
  executionTime?: number
  error?: string
  outputCount?: number
}

export interface WorkflowSettings {
  timezone: string
  saveExecution: "all" | "errors" | "none"
  retryOnFail: boolean
  retryCount: number
  retryDelay: number
  timeout: number
  errorWorkflowId?: string
}

export interface WorkflowData {
  id: string
  name: string
  description?: string
  active: boolean
  nodes: Node<NodeData>[]
  edges: Edge[]
  settings: WorkflowSettings
  tags: string[]
  createdAt: string
  updatedAt: string
  userId: string
  lastExecution?: ExecutionSummary
  executionCount?: number
}

export interface ExecutionSummary {
  id: string
  status: ExecutionStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  mode: ExecutionMode
}

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "ERROR"
  | "CANCELLED"
  | "WAITING"

export type ExecutionMode = "MANUAL" | "WEBHOOK" | "SCHEDULED" | "RETRY"

export interface ExecutionDetail extends ExecutionSummary {
  workflowId: string
  workflowName: string
  error?: string
  steps: ExecutionStepDetail[]
}

export interface ExecutionStepDetail {
  id: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: ExecutionStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  inputData?: unknown
  outputData?: unknown
  error?: string
}

export interface CredentialData {
  id: string
  name: string
  type: string
  createdAt: string
  updatedAt: string
}

export interface NodeDefinition {
  type: NodeType
  label: string
  description: string
  icon: string
  color: string
  category: NodeCategory
  inputs: number
  outputs: number
  configSchema: NodeConfigField[]
  tags?: string[]
}

export type NodeCategory =
  | "triggers"
  | "core"
  | "logic"
  | "integrations"

export interface NodeConfigField {
  key: string
  label: string
  type: "string" | "number" | "boolean" | "select" | "code" | "json" | "expression" | "credential"
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  description?: string
  default?: unknown
}

export interface WorkflowVersion {
  id: string
  workflowId: string
  version: number
  nodes: Node<NodeData>[]
  edges: Edge[]
  settings: WorkflowSettings
  createdAt: string
}
