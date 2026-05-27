import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl
      const isProtected =
        pathname.startsWith("/workflows") ||
        pathname.startsWith("/executions") ||
        pathname.startsWith("/credentials") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/api/workflows") ||
        pathname.startsWith("/api/credentials") ||
        pathname.startsWith("/api/admin")
      if (isProtected && !isLoggedIn) return false
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
