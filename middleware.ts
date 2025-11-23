import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth-token")
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth")

  console.log("[v0] Middleware - Path:", request.nextUrl.pathname)
  console.log("[v0] Middleware - Auth token:", authToken?.value)
  console.log("[v0] Middleware - Is login page:", isLoginPage)

  if (isLoginPage || isAuthApi) {
    console.log("[v0] Middleware - Allowing access to login/auth")
    return NextResponse.next()
  }

  if (!authToken) {
    console.log("[v0] Middleware - No auth token, redirecting to login")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (request.nextUrl.pathname === "/") {
    console.log("[v0] Middleware - Redirecting root to home page")
    return NextResponse.redirect(new URL("/home", request.url))
  }

  console.log("[v0] Middleware - Authenticated, allowing access")
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
