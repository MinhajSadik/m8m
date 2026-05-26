import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ExecutionsClient } from "./executions-client"

export default async function ExecutionsPage() {
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  let serialized: {
    id: string; workflowId: string; workflowName: string; status: string; mode: string;
    startedAt: string; finishedAt?: string; durationMs: number | null; error: string | null;
    steps: { id: string; nodeId: string; nodeName: string; nodeType: string; status: string;
      startedAt: string; finishedAt?: string; durationMs: number | null; error: string | null }[]
  }[] = []

  try {
    const executions = await prisma.workflowExecution.findMany({
      where: { workflow: { userId } },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        workflow: { select: { name: true, id: true } },
        steps: { orderBy: { startedAt: "asc" } },
      },
    })
    serialized = executions.map((e) => ({
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
  } catch {
    // DB not yet configured — render empty state
  }

  return <ExecutionsClient executions={serialized} />
}
export const dynamic = 'force-dynamic'
