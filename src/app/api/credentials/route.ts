import { NextResponse } from "next/server"
import { ensureUserId } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { createCipheriv, randomBytes, scryptSync } from "crypto"

const schema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1),
  data: z.string().min(1),
})

function encrypt(text: string): string {
  const key = scryptSync(process.env.CREDENTIAL_ENCRYPTION_KEY ?? "default-dev-key-change-in-prod", "salt", 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", key, iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  return iv.toString("hex") + ":" + encrypted.toString("hex")
}

export async function GET() {
  const userId = await ensureUserId()

  const credentials = await prisma.credential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json(
    credentials.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  )
}

export async function POST(request: Request) {
  const userId = await ensureUserId()

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const encryptedData = encrypt(parsed.data.data)

  const credential = await prisma.credential.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      data: encryptedData,
      userId,
    },
    select: { id: true, name: true, type: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json({
    ...credential,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  })
}
