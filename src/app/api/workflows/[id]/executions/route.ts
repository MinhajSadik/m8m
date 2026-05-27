import { NextResponse } from "next/server"
import { auth, getUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = getUserId(await auth())
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    select: { id: true },
  })
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId: id },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: {
      steps: { orderBy: { startedAt: "asc" } },
    },
  })

  return NextResponse.json(
    executions.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
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
        inputData: s.inputData,
        outputData: s.outputData,
        error: s.error,
      })),
    }))
  )
}
