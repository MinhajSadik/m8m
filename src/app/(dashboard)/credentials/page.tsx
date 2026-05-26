import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { CredentialsClient } from "./credentials-client"

export default async function CredentialsPage() {
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  let credentials: { id: string; name: string; type: string; createdAt: string; updatedAt: string }[] = []
  try {
    const rows = await prisma.credential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
    })
    credentials = rows.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  } catch {
    // DB not yet configured — render empty state
  }

  return <CredentialsClient credentials={credentials} />
}
export const dynamic = 'force-dynamic'
