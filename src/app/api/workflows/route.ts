import { NextResponse } from "next/server"
import { auth, getUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET() {
  const userId = getUserId(await auth())
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  return NextResponse.json(
    workflows.map((w) => ({
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
        : null,
    }))
  )
}

export async function POST(request: Request) {
  const userId = getUserId(await auth())
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const workflow = await prisma.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      nodes: parsed.data.nodes ?? [],
      edges: parsed.data.edges ?? [],
      tags: parsed.data.tags ?? [],
      userId,
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

  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    active: workflow.active,
    tags: workflow.tags,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  })
}
