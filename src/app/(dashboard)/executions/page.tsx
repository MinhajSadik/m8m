import { auth, getUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ExecutionsClient } from "./executions-client"

export default async function ExecutionsPage() {
  const session = await auth()
  const userId = getUserId(session)
  if (!userId) redirect("/login")

  const executions = await prisma.workflowExecution.findMany({
    where: { workflow: { userId } },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      workflow: { select: { name: true, id: true } },
      steps: { orderBy: { startedAt: "asc" } },
    },
  })

  const serialized = executions.map((e) => ({
    id: e.id,
    workflowId: e.workflowId,
    workflowName: e.workflow.name,
    status: e.status,
    mode: e.mode,
    startedAt: e.startedAt.toISOString(),
    finishedAt: e.finishedAt?.toISOString(),
    durationMs: e.durationMs,
    error: e.error,
    steps: e.steps.map((s) => ({
      id: s.id,
      nodeId: s.nodeId,
      nodeName: s.nodeName,
      nodeType: s.nodeType,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      finishedAt: s.finishedAt?.toISOString(),
      durationMs: s.durationMs,
      error: s.error,
    })),
  }))

  return <ExecutionsClient executions={serialized} />
}

export const dynamic = "force-dynamic"
