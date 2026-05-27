import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memStore } from "@/lib/mem-store"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = (await auth())?.user?.id ?? GUEST_USER_ID

  try {
    const credential = await prisma.credential.findFirst({
      where: { id, userId },
    })
    if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.credential.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    const credential = memStore.credential.findFirst(id, userId)
    if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })
    memStore.credential.delete(id)
    return new NextResponse(null, { status: 204 })
  }
}
