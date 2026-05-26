import { notFound } from "next/navigation"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WorkflowEditorWrapper } from "./workflow-editor-wrapper"
import type { WorkflowData } from "@/types"

const DB_ERROR_UI = (
  <div className="flex items-center justify-center h-full text-center">
    <div className="space-y-2">
      <p className="text-zinc-300 font-medium">Database not configured</p>
      <p className="text-zinc-500 text-sm">Add DATABASE_URL to your environment variables to enable workflows.</p>
    </div>
  </div>
)

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  if (id === "new") {
    try {
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
      const { redirect } = await import("next/navigation")
      redirect(`/workflows/${workflow.id}`)
    } catch (e) {
      if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e
      return DB_ERROR_UI
    }
  }

  try {
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
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e
    if ((e as { name?: string }).name === "NotFoundError") throw e
    return DB_ERROR_UI
  }
}
export const dynamic = 'force-dynamic'
