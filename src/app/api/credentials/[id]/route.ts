import { NextResponse } from "next/server"
import { ensureUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await ensureUserId()

  const credential = await prisma.credential.findFirst({ where: { id, userId } })
  if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.credential.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
