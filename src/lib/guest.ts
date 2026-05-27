import { prisma } from "@/lib/db"
import { GUEST_USER_ID } from "@/lib/auth"

let ensured = false

export async function ensureGuestUser(userId: string) {
  if (userId !== GUEST_USER_ID || ensured) return
  try {
    await prisma.user.upsert({
      where: { id: GUEST_USER_ID },
      update: {},
      create: { id: GUEST_USER_ID, name: "Guest", email: "guest@m8m.local" },
    })
    ensured = true
  } catch {
    // best-effort: if DB is unavailable the caller's try/catch handles it
  }
}
