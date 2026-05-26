import { notFound, redirect } from "next/navigation"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WorkflowEditorWrapper } from "./workflow-editor-wrapper"
import type { WorkflowData } from "@/types"

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

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

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  })

  if (!workflow) notFound()

  const serialized: WorkflowData = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? undefined,
    active: workflow.active,
    nodes: workflow.nodes as unknown as WorkflowData["nodes"],
    edges: workflow.edges as unknown as WorkflowData["edges"],
    settings: workflow.settings as unknown as WorkflowData["settings"],
    tags: workflow.tags,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    userId: workflow.userId,
  }

  return <WorkflowEditorWrapper workflow={serialized} />
}
export const dynamic = 'force-dynamic'
