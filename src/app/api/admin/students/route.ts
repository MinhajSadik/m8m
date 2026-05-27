import { NextResponse } from "next/server"
import { auth, isAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { workflows: true } },
      workflows: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          active: true,
          nodes: true,
          updatedAt: true,
          _count: { select: { executions: true } },
        },
      },
    },
  })

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      workflowCount: u._count.workflows,
      workflows: u.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        nodeCount: Array.isArray(w.nodes) ? (w.nodes as unknown[]).length : 0,
        executionCount: w._count.executions,
        updatedAt: w.updatedAt.toISOString(),
      })),
    }))
  )
}
