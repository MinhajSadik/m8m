import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memStore } from "@/lib/mem-store"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.any()).optional(),
})

async function getWorkflow(id: string, userId: string) {
  try {
    const w = await prisma.workflow.findFirst({ where: { id, userId } })
    if (w) return w
  } catch { /* DB unavailable */ }
  return memStore.workflow.findFirst(id, userId)
}

function getOrCreateWorkflow(id: string, userId: string) {
  const existing = memStore.workflow.findFirst(id, userId)
  if (existing) return existing
  return memStore.workflow.create({
    id,
    name: "Untitled Workflow",
    description: null,
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
    tags: [],
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  let workflow = await getWorkflow(id, userId)
  if (!workflow) workflow = getOrCreateWorkflow(id, userId)

  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    active: workflow.active,
    nodes: workflow.nodes,
    edges: workflow.edges,
    settings: workflow.settings,
    tags: workflow.tags,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  let workflow = await getWorkflow(id, userId)
  if (!workflow) workflow = getOrCreateWorkflow(id, userId)

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { nodes, edges, settings, ...rest } = parsed.data

  try {
    if (nodes !== undefined || edges !== undefined) {
      const latestVersion = await prisma.workflowVersion.findFirst({
        where: { workflowId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      })
      await prisma.workflowVersion.create({
        data: {
          workflowId: id,
          version: (latestVersion?.version ?? 0) + 1,
          nodes: JSON.parse(JSON.stringify(nodes ?? workflow.nodes)),
          edges: JSON.parse(JSON.stringify(edges ?? workflow.edges)),
          settings: JSON.parse(JSON.stringify(settings ?? workflow.settings)),
        },
      })
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(settings !== undefined && { settings }),
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      active: updated.active,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch {
    const updated = memStore.workflow.update(id, {
      ...rest,
      ...(nodes !== undefined && { nodes }),
      ...(edges !== undefined && { edges }),
      ...(settings !== undefined && { settings }),
    })
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      active: updated.active,
      updatedAt: updated.updatedAt.toISOString(),
    })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  try {
    const existing = await prisma.workflow.findFirst({ where: { id, userId } })
    if (existing) {
      await prisma.workflow.delete({ where: { id } })
      return new NextResponse(null, { status: 204 })
    }
  } catch { /* DB unavailable, fall through to memStore */ }

  memStore.workflow.delete(id)
  return new NextResponse(null, { status: 204 })
}
