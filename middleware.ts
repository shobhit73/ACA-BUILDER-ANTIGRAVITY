import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log(`[Middleware] Processing request for: ${path}`)

  // Retrieve auth token from request cookies
  const authToken = request.cookies.get("auth-token")?.value
  console.log(`[Middleware] Auth token present: ${!!authToken}`)

  const isLoginPage = path === "/login"
  const isAuthApi = path.startsWith("/api/auth")

  // Allow login page and auth APIs without token
  if (isLoginPage || isAuthApi) {
    console.log(`[Middleware] Allowing public path: ${path}`)
    return NextResponse.next()
  }

  // No token -> redirect to login
  if (!authToken) {
    console.log(`[Middleware] No token, redirecting to /login`)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verify JWT token
  try {
    const payload = await verifyToken(authToken)
    if (!payload) {
      console.log(`[Middleware] Invalid token (verify returned null), redirecting to /login`)
      return NextResponse.redirect(new URL("/login", request.url))
    }
    console.log(`[Middleware] Token valid for user: ${payload.email}`)

    // Attach user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", payload.user_id)
    if (payload.tenant_id) requestHeaders.set("x-tenant-id", payload.tenant_id)
    requestHeaders.set("x-user-role", payload.role)

    // Continue with modified request
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch (e) {
    console.error(`[Middleware] Token verification threw error:`, e)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
