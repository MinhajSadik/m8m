import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memStore } from "@/lib/mem-store"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  let workflow: { name: string; description: string | null; nodes: unknown; edges: unknown; settings: unknown; tags: string[] } | null = null
  try {
    workflow = await prisma.workflow.findFirst({ where: { id, userId } })
  } catch {
    workflow = memStore.workflow.findFirst(id, userId)
  }
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const copy = await prisma.workflow.create({
      data: {
        name: `${workflow.name} (copy)`,
        description: workflow.description,
        nodes: JSON.parse(JSON.stringify(workflow.nodes)),
        edges: JSON.parse(JSON.stringify(workflow.edges)),
        settings: JSON.parse(JSON.stringify(workflow.settings)),
        tags: workflow.tags,
        userId,
        active: false,
      },
    })

    return NextResponse.json({
      id: copy.id,
      name: copy.name,
      description: copy.description,
      active: copy.active,
      tags: copy.tags,
      createdAt: copy.createdAt.toISOString(),
      updatedAt: copy.updatedAt.toISOString(),
      executionCount: 0,
    })
  } catch {
    const copy = memStore.workflow.create({
      name: `${workflow.name} (copy)`,
      description: workflow.description,
      nodes: workflow.nodes as unknown[],
      edges: workflow.edges as unknown[],
      settings: workflow.settings as Record<string, unknown>,
      tags: workflow.tags,
      userId,
    })

    return NextResponse.json({
      id: copy.id,
      name: copy.name,
      description: copy.description,
      active: copy.active,
      tags: copy.tags,
      createdAt: copy.createdAt.toISOString(),
      updatedAt: copy.updatedAt.toISOString(),
      executionCount: 0,
    })
  }
}
