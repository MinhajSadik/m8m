import { NextResponse } from "next/server"
import { auth, GUEST_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = (await auth())?.user?.id ?? GUEST_USER_ID

    const credential = await prisma.credential.findFirst({
      where: { id, userId },
    })
    if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.credential.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
  }
}
