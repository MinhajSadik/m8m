import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memStore } from "@/lib/mem-store"
import { WorkflowsClient } from "./workflows-client"

export default async function WorkflowsPage() {
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  type SerializedWorkflow = {
    id: string; name: string; description: string | null; active: boolean; tags: string[]
    createdAt: string; updatedAt: string; executionCount: number
    lastExecution?: { id: string; status: string; startedAt: string; finishedAt?: string; durationMs: number | null; mode: string }
  }

  let serialized: SerializedWorkflow[] = []
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { executions: true } },
        executions: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: { status: true, startedAt: true, finishedAt: true, durationMs: true, mode: true, id: true },
        },
      },
    })
    serialized = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      active: w.active,
      tags: w.tags,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      executionCount: w._count.executions,
      lastExecution: w.executions[0]
        ? {
            id: w.executions[0].id,
            status: w.executions[0].status,
            startedAt: w.executions[0].startedAt.toISOString(),
            finishedAt: w.executions[0].finishedAt?.toISOString(),
            durationMs: w.executions[0].durationMs,
            mode: w.executions[0].mode,
          }
        : undefined,
    }))
  } catch {
    const workflows = memStore.workflow.findMany(userId)
    serialized = workflows.map((w) => {
      const execs = memStore.execution.findMany(w.id)
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        active: w.active,
        tags: w.tags,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        executionCount: execs.length,
        lastExecution: execs[0]
          ? {
              id: execs[0].id,
              status: execs[0].status,
              startedAt: execs[0].startedAt.toISOString(),
              finishedAt: execs[0].finishedAt?.toISOString(),
              durationMs: execs[0].durationMs,
              mode: execs[0].mode,
            }
          : undefined,
      }
    })
  }

  return <WorkflowsClient workflows={serialized} />
}
export const dynamic = 'force-dynamic'
