import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WorkflowsClient } from "./workflows-client"

export default async function WorkflowsPage() {
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID
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

  const serialized = workflows.map((w) => ({
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

  return <WorkflowsClient workflows={serialized} />
}
export const dynamic = 'force-dynamic'
