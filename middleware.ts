import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth-token")
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth")

  console.log("[v0] Middleware - Path:", request.nextUrl.pathname)
  console.log("[v0] Middleware - Has auth:", !!authToken)

  if (isLoginPage || isAuthApi) {
    return NextResponse.next()
  }

  if (!authToken) {
    console.log("[v0] Middleware - No auth token, redirecting to login")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  console.log("[v0] Middleware - Authenticated, allowing access")
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
