"use client"

import { ReactFlowProvider } from "@xyflow/react"
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor"
import type { WorkflowData } from "@/types"

export function WorkflowEditorWrapper({ workflow }: { workflow: WorkflowData }) {
  return (
    <ReactFlowProvider>
      <WorkflowEditor workflow={workflow} />
    </ReactFlowProvider>
  )
}
