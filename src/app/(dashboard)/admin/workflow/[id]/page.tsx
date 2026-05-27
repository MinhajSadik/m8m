import { ensureUserId, auth, isAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { WorkflowEditorWrapper } from "../../../workflows/[id]/workflow-editor-wrapper"
import type { WorkflowData } from "@/types"

export default async function AdminWorkflowViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await ensureUserId()
  const session = await auth()
  if (!isAdmin(session)) redirect("/workflows")

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!workflow) redirect("/admin")

  const data: WorkflowData = {
    id: workflow.id,
    name: `[${workflow.user.name || workflow.user.email}] ${workflow.name}`,
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
