import { ensureUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { WorkflowEditorWrapper } from "./workflow-editor-wrapper"
import type { WorkflowData } from "@/types"

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await ensureUserId()

  if (id === "new") {
    const workflow = await prisma.workflow.create({
      data: {
        name: "Untitled Workflow",
        userId,
        nodes: [],
        edges: [],
        settings: {
          timezone: "UTC",
          saveExecution: "all",
          retryOnFail: false,
          retryCount: 3,
          retryDelay: 1000,
          timeout: 30000,
        },
      },
    })
    redirect(`/workflows/${workflow.id}`)
  }

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } })
  if (!workflow) redirect("/workflows")

  const data: WorkflowData = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? undefined,
    active: workflow.active,
    nodes: workflow.nodes as unknown as WorkflowData["nodes"],
    edges: workflow.edges as unknown as WorkflowData["edges"],
    settings: workflow.settings as unknown as WorkflowData["settings"],
    tags: workflow.tags,
    userId: workflow.userId,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  }

  return <WorkflowEditorWrapper workflow={data} />
}

export const dynamic = "force-dynamic"
