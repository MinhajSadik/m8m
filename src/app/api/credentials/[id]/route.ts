import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const credential = await prisma.credential.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.credential.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
