import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized() {
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
