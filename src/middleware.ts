import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export const middleware = auth

export const config = {
  matcher: [
    "/workflows/:path*",
    "/executions/:path*",
    "/credentials/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/workflows/:path*",
    "/api/credentials/:path*",
    "/api/admin/:path*",
  ],
}
