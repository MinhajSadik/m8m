import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CredentialsClient } from "./credentials-client"

export default async function CredentialsPage() {
  const session = await auth()

  const credentials = await prisma.credential.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  })

  return (
    <CredentialsClient
      credentials={credentials.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  )
}
export const dynamic = 'force-dynamic'
