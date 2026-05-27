import { ensureUserId, auth, isAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { AdminClient } from "./admin-client"

export default async function AdminPage() {
  const userId = await ensureUserId()
  const session = await auth()
  if (!isAdmin(session)) redirect("/workflows")

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
          edges: true,
          updatedAt: true,
          _count: { select: { executions: true } },
        },
      },
    },
  })

  const serialized = users.map((u) => ({
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
      edgeCount: Array.isArray(w.edges) ? (w.edges as unknown[]).length : 0,
      executionCount: w._count.executions,
      updatedAt: w.updatedAt.toISOString(),
    })),
  }))

  return <AdminClient students={serialized} />
}

export const dynamic = "force-dynamic"
