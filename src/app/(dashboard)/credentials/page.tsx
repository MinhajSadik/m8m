import { ensureUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CredentialsClient } from "./credentials-client"

export default async function CredentialsPage() {
  const userId = await ensureUserId()

  const rows = await prisma.credential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  })

  const credentials = rows.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <CredentialsClient credentials={credentials} />
}

export const dynamic = "force-dynamic"
