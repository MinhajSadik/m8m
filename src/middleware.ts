export { auth as middleware } from "@/lib/auth"

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
