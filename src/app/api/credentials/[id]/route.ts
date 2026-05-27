import { NextResponse } from "next/server"
import { auth, getUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = getUserId(await auth())
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const credential = await prisma.credential.findFirst({ where: { id, userId } })
  if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.credential.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
