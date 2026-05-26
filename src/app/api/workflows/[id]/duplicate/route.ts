import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const copy = await prisma.workflow.create({
    data: {
      name: `${workflow.name} (copy)`,
      description: workflow.description,
      nodes: JSON.parse(JSON.stringify(workflow.nodes)),
      edges: JSON.parse(JSON.stringify(workflow.edges)),
      settings: JSON.parse(JSON.stringify(workflow.settings)),
      tags: workflow.tags,
      userId: session.user.id,
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
}
